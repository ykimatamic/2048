import type { Board, Direction } from "./types.ts";
import { BOARD_SIZE } from "./types.ts";

export type BB = number[];

export const POW2 = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

export function valueToExp(value: number): number {
  if (value <= 0) return 0;
  return Math.min(15, Math.round(Math.log2(value)));
}

export function toBitboard(board: Board): BB {
  const bb: BB = [0, 0, 0, 0];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      bb[r] |= valueToExp(board[r][c]) << (4 * c);
    }
  }
  return bb;
}

export function fromBitboard(bb: BB): Board {
  const board: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const exp = (bb[r] >> (4 * c)) & 0xf;
      row.push(exp === 0 ? 0 : POW2[exp]);
    }
    board.push(row);
  }
  return board;
}

function unpack(row: number): number[] {
  return [(row & 0xf), ((row >> 4) & 0xf), ((row >> 8) & 0xf), ((row >> 12) & 0xf)];
}

function pack(exps: number[]): number {
  return (exps[0] | (exps[1] << 4) | (exps[2] << 8) | (exps[3] << 12)) & 0xffff;
}

function slideRow(exps: number[]): { out: number[]; gain: number } {
  const filtered = exps.filter((e) => e !== 0);
  const out: number[] = [];
  let gain = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const mergedExp = filtered[i] + 1;
      out.push(mergedExp);
      gain += mergedExp < 16 ? POW2[mergedExp] : 65536;
      i += 2;
    } else {
      out.push(filtered[i]);
      i += 1;
    }
  }
  while (out.length < BOARD_SIZE) out.push(0);
  return { out, gain };
}

// ---- 行ルックアップテーブル(初回 import 時に一度だけ構築) ----

const ROW_LEFT_RESULT = new Uint16Array(65536);
const ROW_RIGHT_RESULT = new Uint16Array(65536);
const ROW_LEFT_GAIN = new Float64Array(65536);
const ROW_RIGHT_GAIN = new Float64Array(65536);
const ROW_LEFT_MOVED = new Uint8Array(65536);
const ROW_RIGHT_MOVED = new Uint8Array(65536);

const ROW_EMPTY = new Uint8Array(65536);
const ROW_MAX_EXP = new Uint8Array(65536);
const ROW_MONO = new Float64Array(65536);
const ROW_SMOOTH = new Float64Array(65536);
const ROW_WEIGHT: Float64Array[] = [];

const WEIGHTS = [
  [15, 14, 13, 12],
  [8, 9, 10, 11],
  [7, 6, 5, 4],
  [0, 1, 2, 3],
];

(function buildLookupTables() {
  for (let r = 0; r < BOARD_SIZE; r++) {
    ROW_WEIGHT.push(new Float64Array(65536));
  }

  for (let row = 0; row < 65536; row++) {
    const exps = unpack(row);
    const values = exps.map((e) => (e === 0 ? 0 : POW2[e]));

    // 移動テーブル(left / right)
    const left = slideRow(exps);
    ROW_LEFT_RESULT[row] = pack(left.out);
    ROW_LEFT_GAIN[row] = left.gain;
    ROW_LEFT_MOVED[row] = pack(left.out) !== row ? 1 : 0;

    const reversed = [...exps].reverse();
    const right = slideRow(reversed);
    ROW_RIGHT_RESULT[row] = pack(right.out.reverse());
    ROW_RIGHT_GAIN[row] = right.gain;
    ROW_RIGHT_MOVED[row] = ROW_RIGHT_RESULT[row] !== row ? 1 : 0;

    // 評価用テーブル
    let empty = 0;
    let maxExp = 0;
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (exps[c] === 0) empty++;
      else if (exps[c] > maxExp) maxExp = exps[c];
    }
    ROW_EMPTY[row] = empty;
    ROW_MAX_EXP[row] = maxExp;

    let inc = 0;
    let dec = 0;
    let smooth = 0;
    for (let c = 0; c < BOARD_SIZE - 1; c++) {
      const a = values[c];
      const b = values[c + 1];
      if (a !== 0 && b !== 0) {
        if (a > b) dec += Math.log2(a) - Math.log2(b);
        else inc += Math.log2(b) - Math.log2(a);
        smooth -= Math.abs(Math.log2(a) - Math.log2(b));
      }
    }
    ROW_MONO[row] = -Math.min(inc, dec);
    ROW_SMOOTH[row] = smooth;

    // 各行位置ごとの重み付き和
    for (let rIdx = 0; rIdx < BOARD_SIZE; rIdx++) {
      let w = 0;
      for (let c = 0; c < BOARD_SIZE; c++) {
        w += values[c] * WEIGHTS[rIdx][c];
      }
      ROW_WEIGHT[rIdx][row] = w;
    }
  }
})();

export function transposeBB(bb: BB): BB {
  const t: BB = [0, 0, 0, 0];
  for (let c = 0; c < BOARD_SIZE; c++) {
    const shift = 4 * c;
    let v = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      v |= ((bb[i] >> shift) & 0xf) << (4 * i);
    }
    t[c] = v;
  }
  return t;
}

export interface BBMoveResult {
  bb: BB;
  gain: number;
  moved: boolean;
}

function moveRows(bb: BB, result: Uint16Array, gainT: Float64Array, movedT: Uint8Array): BBMoveResult {
  let gain = 0;
  let moved = false;
  const out: BB = [0, 0, 0, 0];
  for (let i = 0; i < BOARD_SIZE; i++) {
    const r = bb[i];
    out[i] = result[r];
    gain += gainT[r];
    if (movedT[r]) moved = true;
  }
  return { bb: out, gain, moved };
}

export function moveBB(bb: BB, dir: Direction): BBMoveResult {
  switch (dir) {
    case "left":
      return moveRows(bb, ROW_LEFT_RESULT, ROW_LEFT_GAIN, ROW_LEFT_MOVED);
    case "right":
      return moveRows(bb, ROW_RIGHT_RESULT, ROW_RIGHT_GAIN, ROW_RIGHT_MOVED);
    case "up":
      return moveVerticalBB(bb, "up");
    case "down":
      return moveVerticalBB(bb, "down");
  }
}

/** up/down は転置して処理し、結果を転置し直す */
export function moveVerticalBB(bb: BB, dir: "up" | "down"): BBMoveResult {
  const table =
    dir === "up"
      ? { result: ROW_LEFT_RESULT, gain: ROW_LEFT_GAIN, moved: ROW_LEFT_MOVED }
      : { result: ROW_RIGHT_RESULT, gain: ROW_RIGHT_GAIN, moved: ROW_RIGHT_MOVED };
  const t = transposeBB(bb);
  const movedResult = moveRows(t, table.result, table.gain, table.moved);
  return { bb: transposeBB(movedResult.bb), gain: movedResult.gain, moved: movedResult.moved };
}

export function emptyPositionsBB(bb: BB): number[] {
  const positions: number[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = bb[r];
    if ((row & 0xf) === 0) positions.push(r * BOARD_SIZE);
    if (((row >> 4) & 0xf) === 0) positions.push(r * BOARD_SIZE + 1);
    if (((row >> 8) & 0xf) === 0) positions.push(r * BOARD_SIZE + 2);
    if (((row >> 12) & 0xf) === 0) positions.push(r * BOARD_SIZE + 3);
  }
  return positions;
}

export function placeExpAt(bb: BB, idx: number, exp: number): BB {
  const r = idx >> 2;
  const c = (idx & 3) * 4;
  const out = [bb[0], bb[1], bb[2], bb[3]];
  out[r] = (out[r] & ~(0xf << c)) | (exp << c);
  return out;
}

const EMPTY_WEIGHT = 270;
const MONO_WEIGHT = 47;
const SMOOTH_WEIGHT = 10;
const WIN_BONUS = 100000;

export function evaluateBB(bb: BB): number {
  let empty = 0;
  let weighted = 0;
  let mono = 0;
  let smooth = 0;
  let maxExp = 0;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const r = bb[i];
    empty += ROW_EMPTY[r];
    weighted += ROW_WEIGHT[i][r];
    mono += ROW_MONO[r];
    smooth += ROW_SMOOTH[r];
    const me = ROW_MAX_EXP[r];
    if (me > maxExp) maxExp = me;
  }

  const t = transposeBB(bb);
  for (let i = 0; i < BOARD_SIZE; i++) {
    const r = t[i];
    mono += ROW_MONO[r];
    smooth += ROW_SMOOTH[r];
  }

  let score = empty * EMPTY_WEIGHT + weighted + mono * MONO_WEIGHT + smooth * SMOOTH_WEIGHT;
  if (maxExp >= 11) score += WIN_BONUS;
  return score;
}

export function canMoveBB(bb: BB): boolean {
  for (const dir of ["left", "right", "up", "down"] as Direction[]) {
    if (moveBB(bb, dir).moved) return true;
  }
  return false;
}
