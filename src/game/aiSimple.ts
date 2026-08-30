import type { Board, Direction } from "./types.ts";
import { moveLeft, moveRight, moveUp, moveDown } from "./move.ts";

/**
 * 任意サイズ盤面用の配列ベース expectimax。
 * 4x4 は bitboard.ts の LUT エンジン(ai.ts)を使い、
 * 3x3 / 5x5 などはこの簡易エンジンへフォールバックする。
 */

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

/** chance node のサンプル数上限(爆発防止) */
const CHANCE_SAMPLE_MAX = 6;

/** log2 事前計算テーブル(盤面値は 2 の冪。最大 2^17=131072 まで) */
const MAX_TILE_VALUE = 1 << 17;
const LOG2 = new Array<number>(MAX_TILE_VALUE + 1).fill(0);
for (let v = 2; v <= MAX_TILE_VALUE; v *= 2) {
  LOG2[v] = Math.log2(v);
}

/** 0.5^d の事前計算テーブル(コーナー重み用。d = r+c、最大でも 8 程度) */
const HALF_POW = new Array<number>(16).fill(1);
for (let d = 1; d < 16; d++) {
  HALF_POW[d] = HALF_POW[d - 1] * 0.5;
}

function moveBoardSimple(board: Board, dir: Direction): { board: Board; gain: number; moved: boolean } {
  switch (dir) {
    case "left": {
      const r = moveLeft(board);
      return { board: r.board, gain: r.scoreGain, moved: r.moved };
    }
    case "right": {
      const r = moveRight(board);
      return { board: r.board, gain: r.scoreGain, moved: r.moved };
    }
    case "up": {
      const r = moveUp(board);
      return { board: r.board, gain: r.scoreGain, moved: r.moved };
    }
    case "down": {
      const r = moveDown(board);
      return { board: r.board, gain: r.scoreGain, moved: r.moved };
    }
  }
}

function emptyCells(board: Board): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 0) out.push([r, c]);
    }
  }
  return out;
}

function evaluate(board: Board): number {
  const n = board.length;
  let empty = 0;
  let mono = 0;
  let smooth = 0;
  let maxV = 0;

  const rows: number[][] = board.map((row) => [...row]);
  const cols: number[][] = [];
  for (let c = 0; c < n; c++) cols.push(rows.map((row) => row[c]));

  const lines = [...rows, ...cols];
  for (const line of lines) {
    let inc = 0;
    let dec = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      if (a !== 0 && b !== 0) {
        const la = LOG2[a];
        const lb = LOG2[b];
        if (a > b) dec += la - lb;
        else inc += lb - la;
        smooth -= Math.abs(la - lb);
      }
      if (line[i] > maxV) maxV = line[i];
    }
    const last = line[line.length - 1];
    if (last > maxV) maxV = last;
    mono += -Math.min(inc, dec);
  }

  for (const row of board) {
    for (const v of row) {
      if (v === 0) empty++;
    }
  }

  // 角寄せの近似: 左上からのコーナー重み(サイズ非依存の単純な距離減衰)
  let corner = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      corner += board[r][c] * HALF_POW[r + c];
    }
  }

  return (
    empty * 270 +
    mono * 47 +
    smooth * 10 +
    corner +
    (maxV >= 2048 ? 100000 : 0)
  );
}

function expectimax(board: Board, depth: number, isPlayerTurn: boolean): number {
  if (depth === 0) return evaluate(board);

  if (isPlayerTurn) {
    let best = -Infinity;
    for (const dir of DIRECTIONS) {
      const result = moveBoardSimple(board, dir);
      if (!result.moved) continue;
      const score = expectimax(result.board, depth - 1, false);
      if (score > best) best = score;
    }
    if (best === -Infinity) return evaluate(board);
    return best;
  }

  const empties = emptyCells(board);
  if (empties.length === 0) return evaluate(board);

  // 空きが多い場合は代表位置を等間隔にサンプリング
  let sample = empties;
  if (empties.length > CHANCE_SAMPLE_MAX) {
    sample = [];
    const stride = empties.length / CHANCE_SAMPLE_MAX;
    for (let k = 0; k < CHANCE_SAMPLE_MAX; k++) {
      sample.push(empties[Math.floor(k * stride)]);
    }
  }
  let total = 0;
  for (const [r, c] of sample) {
    board[r][c] = 2;
    total += 0.9 * expectimax(board, depth - 1, true);
    board[r][c] = 4;
    total += 0.1 * expectimax(board, depth - 1, true);
    board[r][c] = 0;
  }
  return total / sample.length;
}

interface DepthProfile {
  verySparse: number;
  sparse: number;
  dense: number;
}

/** 難易度ごとの探索深さ(ai.ts のプロファイルに対応) */
const DEPTH_PROFILES: Record<string, DepthProfile> = {
  easy: { verySparse: 2, sparse: 2, dense: 3 },
  normal: { verySparse: 3, sparse: 3, dense: 4 },
  hard: { verySparse: 3, sparse: 4, dense: 5 },
};

function selectDepth(board: Board, difficulty: string): number {
  const profile = DEPTH_PROFILES[difficulty] ?? DEPTH_PROFILES.normal;
  const empties = emptyCells(board).length;
  if (empties > board.length * board.length / 2) return profile.verySparse;
  if (empties > 4) return profile.sparse;
  return profile.dense;
}

export function getBestDirectionSimple(
  board: Board,
  difficulty: "easy" | "normal" | "hard",
): Direction | null {
  const workBoard = board.map((row) => [...row]);
  let bestScore = -Infinity;
  let bestDir: Direction | null = null;
  const depth = selectDepth(workBoard, difficulty);

  for (const dir of DIRECTIONS) {
    const result = moveBoardSimple(workBoard, dir);
    if (!result.moved) continue;
    const score = expectimax(result.board, depth, false);
    if (score > bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  return bestDir;
}
