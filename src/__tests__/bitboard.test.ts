import { describe, it, expect } from "vitest";
import {
  toBitboard,
  moveBB,
  evaluateBB,
  emptyPositionsBB,
  placeExpAt,
} from "../game/bitboard.ts";
import { moveBoard } from "../game/game.ts";
import type { Board, Direction } from "../game/types.ts";
import { mulberry32 } from "../game/rng.ts";

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

const WEIGHTS = [
  [15, 14, 13, 12],
  [8, 9, 10, 11],
  [7, 6, 5, 4],
  [0, 1, 2, 3],
];

function countEmpty(board: Board): number {
  let n = 0;
  for (const row of board) for (const v of row) if (v === 0) n++;
  return n;
}

function getMaxTile(board: Board): number {
  let max = 0;
  for (const row of board) for (const v of row) if (v > max) max = v;
  return max;
}

function getMonotonicity(board: Board): number {
  let score = 0;
  const lines: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const row: number[] = [];
    const col: number[] = [];
    for (let c = 0; c < 4; c++) {
      row.push(board[i][c]);
      col.push(board[c][i]);
    }
    lines.push(row, col);
  }
  for (const line of lines) {
    let inc = 0;
    let dec = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i];
      const b = line[i + 1];
      if (a !== 0 && b !== 0) {
        if (a > b) dec += Math.log2(a) - Math.log2(b);
        else inc += Math.log2(b) - Math.log2(a);
      }
    }
    score -= Math.min(inc, dec);
  }
  return score;
}

function getSmoothness(board: Board): number {
  let score = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      if (c + 1 < 4 && board[r][c + 1] !== 0) {
        score -= Math.abs(Math.log2(v) - Math.log2(board[r][c + 1]));
      }
      if (r + 1 < 4 && board[r + 1][c] !== 0) {
        score -= Math.abs(Math.log2(v) - Math.log2(board[r + 1][c]));
      }
    }
  }
  return score;
}

function getWeightedSum(board: Board): number {
  let score = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      score += board[r][c] * WEIGHTS[r][c];
    }
  }
  return score;
}

/** ai.ts(旧実装)の evaluateBoard の参照実装 */
function evaluateReference(board: Board): number {
  return (
    countEmpty(board) * 270 +
    getWeightedSum(board) +
    getMonotonicity(board) * 47 +
    getSmoothness(board) * 10 +
    (getMaxTile(board) >= 2048 ? 100000 : 0)
  );
}

function randomBoard(rand: () => number): Board {
  const values = [0, 0, 2, 2, 2, 4, 8, 16, 32];
  const board: Board = [];
  for (let r = 0; r < 4; r++) {
    const row: number[] = [];
    for (let c = 0; c < 4; c++) {
      row.push(values[Math.floor(rand() * values.length)]);
    }
    board.push(row);
  }
  return board;
}

describe("bitboard parity with array implementation", () => {
  it("move results are identical for many random boards", () => {
    const rand = mulberry32(1234);
    for (let iter = 0; iter < 500; iter++) {
      const board = randomBoard(rand);
      const bb = toBitboard(board);
      for (const dir of DIRECTIONS) {
        const ref = moveBoard(board, dir);
        const fast = moveBB(bb, dir);
        expect(fast.moved).toBe(ref.moved);
        expect(fast.gain).toBe(ref.scoreGain);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const exp = (fast.bb[r] >> (4 * c)) & 0xf;
            expect(exp === 0 ? 0 : Math.pow(2, exp)).toBe(ref.board[r][c]);
          }
        }
      }
    }
  });

  it("evaluation is identical for many random boards", () => {
    const rand = mulberry32(5678);
    for (let iter = 0; iter < 500; iter++) {
      const board = randomBoard(rand);
      const bb = toBitboard(board);
      expect(evaluateBB(bb)).toBeCloseTo(evaluateReference(board), 6);
    }
  });

  it("empty positions match", () => {
    const rand = mulberry32(9999);
    for (let iter = 0; iter < 200; iter++) {
      const board = randomBoard(rand);
      const bb = toBitboard(board);
      const expected: number[] = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (board[r][c] === 0) expected.push(r * 4 + c);
        }
      }
      expect(emptyPositionsBB(bb)).toEqual(expected);
    }
  });

  it("placeExpAt places tiles at the right cell", () => {
    const bb = toBitboard([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const placed = placeExpAt(placeExpAt(bb, 5, 3), 15, 1);
    expect((placed[1] >> 4) & 0xf).toBe(3);
    expect((placed[3] >> 12) & 0xf).toBe(1);
  });
});
