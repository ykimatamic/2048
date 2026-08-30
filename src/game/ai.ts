import type { Board, Direction } from "./types.ts";
import { BOARD_SIZE } from "./types.ts";
import {
  moveBB,
  evaluateBB,
  toBitboard,
  emptyPositionsBB,
  placeExpAt,
} from "./bitboard.ts";
import type { BB } from "./bitboard.ts";
import { getBestDirectionSimple } from "./aiSimple.ts";

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

/** 難易度。探索深さのプロファイルで表現する */
export type Difficulty = "easy" | "normal" | "hard";

interface DepthProfile {
  verySparse: number;
  sparse: number;
  dense: number;
}

/** 空きマス数に応じた探索深さ(verySparse: 空き > 8 / sparse: 空き > 4 / dense: その他) */
const DEPTH_PROFILES: Record<Difficulty, DepthProfile> = {
  easy: { verySparse: 2, sparse: 3, dense: 3 },
  normal: { verySparse: 4, sparse: 5, dense: 6 },
  hard: { verySparse: 5, sparse: 6, dense: 7 },
};

let currentDifficulty: Difficulty = "normal";

/** AI パフォーマンスモニタリング有効フラグ。デバッグ時に true にすると探索統計を出力 */
let performanceLogging = false;

export function setPerformanceLogging(enabled: boolean): void {
  performanceLogging = enabled;
}

export function setDifficulty(d: Difficulty): void {
  currentDifficulty = d;
}

export function getDifficulty(): Difficulty {
  return currentDifficulty;
}

/** 空きセル数による深さ選択のしきい値 */
const VERY_SPARSE_THRESHOLD = 8;
const DENSE_THRESHOLD = 4;
/** 残り深さが深い chance node のサンプル数上限(hard の深探索で爆発しないよう制限) */
const CHANCE_SAMPLE_DEEP_MAX = 6;
const DEEP_REMAINING_THRESHOLD = 7;

/** 反復深化の制限時間。最悪ケースのスパイクを抑制する(通常時は完了しない余裕を持たせる) */
const TIME_BUDGET_MS: Record<Difficulty, number> = {
  easy: 60,
  normal: 150,
  hard: 400,
};
/** 時間チェックの間隔(ノード数)。都度 performance.now() を呼ばないための間引き */
const NODE_CHECK_INTERVAL = 512;

let deadlineAt = Infinity;
let searchAborted = false;
let nodeCount = 0;

interface TTEntry {
  depth: number;
  score: number;
}

/** 置換表。文字列キーを避けるため 64bit 盤面を 2 つの int32 キーに分けた 2 段 Map */
let tt = new Map<number, Map<number, TTEntry>>();

function outerKey(bb: BB): number {
  return bb[0] | (bb[1] << 16);
}

function innerKey(bb: BB): number {
  return bb[2] | (bb[3] << 16);
}

function ttSet(bb: BB, entry: TTEntry): void {
  const ok = outerKey(bb);
  let inner = tt.get(ok);
  if (!inner) {
    inner = new Map();
    tt.set(ok, inner);
  }
  inner.set(innerKey(bb), entry);
}

function countEmptyBB(bb: BB): number {
  let count = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = bb[i];
    count += (row & 0xf) === 0 ? 1 : 0;
    count += ((row >> 4) & 0xf) === 0 ? 1 : 0;
    count += ((row >> 8) & 0xf) === 0 ? 1 : 0;
    count += ((row >> 12) & 0xf) === 0 ? 1 : 0;
  }
  return count;
}

function expectimax(bb: BB, depth: number, isPlayerTurn: boolean): number {
  if (searchAborted) return 0;
  if (++nodeCount >= NODE_CHECK_INTERVAL) {
    nodeCount = 0;
    if (performance.now() > deadlineAt) {
      searchAborted = true;
      return 0;
    }
  }
  if (depth === 0) {
    return evaluateBB(bb);
  }

  if (isPlayerTurn) {
    const cached = tt.get(outerKey(bb))?.get(innerKey(bb));
    if (cached && cached.depth >= depth) {
      return cached.score;
    }
    let best = -Infinity;
    for (const dir of DIRECTIONS) {
      const result = moveBB(bb, dir);
      if (!result.moved) continue;
      const score = expectimax(result.bb, depth - 1, false);
      if (score > best) best = score;
    }
    if (best === -Infinity) {
      return evaluateBB(bb);
    }
    ttSet(bb, { depth, score: best });
    return best;
  }

  const emptyPositions = emptyPositionsBB(bb);
  if (emptyPositions.length === 0) {
    return evaluateBB(bb);
  }

  // 残り深さが深い場合は代表位置を等間隔にサンプリング(均一平均の不偏推定)
  let sample = emptyPositions;
  if (
    depth >= DEEP_REMAINING_THRESHOLD &&
    sample.length > CHANCE_SAMPLE_DEEP_MAX
  ) {
    const stride = emptyPositions.length / CHANCE_SAMPLE_DEEP_MAX;
    sample = [];
    for (let k = 0; k < CHANCE_SAMPLE_DEEP_MAX; k++) {
      sample.push(emptyPositions[Math.floor(k * stride)]);
    }
  }
  let total = 0;
  for (const idx of sample) {
    total += 0.9 * expectimax(placeExpAt(bb, idx, 1), depth - 1, true);
    total += 0.1 * expectimax(placeExpAt(bb, idx, 2), depth - 1, true);
  }
  return total / sample.length;
}

function selectDepth(bb: BB): number {
  const profile = DEPTH_PROFILES[currentDifficulty];
  const empties = countEmptyBB(bb);
  if (empties > VERY_SPARSE_THRESHOLD) return profile.verySparse;
  if (empties > DENSE_THRESHOLD) return profile.sparse;
  return profile.dense;
}

export function getBestDirection(board: Board): Direction | null {
  // bitboard LUT は 4x4 専用。それ以外のサイズは簡易エンジンへ
  if (board.length !== BOARD_SIZE) {
    return getBestDirectionSimple(board, currentDifficulty);
  }

  const root = toBitboard(board);
  tt = new Map();

  // 反復深化: 浅い深さから段階的に上げ、制限時間を超えたら直前に完了した結果を使う
  const maxDepth = selectDepth(root);
  deadlineAt = performance.now() + TIME_BUDGET_MS[currentDifficulty];
  searchAborted = false;
  nodeCount = 0;

  let bestDir: Direction | null = null;
  for (let depth = 1; depth <= maxDepth && !searchAborted; depth++) {
    let iterScore = -Infinity;
    let iterDir: Direction | null = null;
    for (const dir of DIRECTIONS) {
      const result = moveBB(root, dir);
      if (!result.moved) continue;
      const score = expectimax(result.bb, depth, false);
      if (searchAborted) break;
      if (score > iterScore) {
        iterScore = score;
        iterDir = dir;
      }
    }
    if (!searchAborted && iterDir !== null) {
      bestDir = iterDir;
    }
  }

  // フォールバック: 探索で結果が得られなかった場合は簡易AIを使用
  const dir = bestDir ?? getBestDirectionSimple(board, currentDifficulty);

  if (performanceLogging) {
    const elapsed = performance.now() - (deadlineAt - TIME_BUDGET_MS[currentDifficulty]);
    console.log(
      `[AI] difficulty=${currentDifficulty} depth=${maxDepth} nodes=${nodeCount} time=${elapsed.toFixed(1)}ms dir=${dir}`,
    );
  }

  return dir;
}

export function getHint(board: Board): Direction | null {
  return getBestDirection(board);
}
