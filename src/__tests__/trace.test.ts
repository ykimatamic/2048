import { describe, it, expect } from "vitest";
import { traceMovements } from "../game/trace.ts";
import { moveBoard } from "../game/game.ts";
import type { Board, Direction } from "../game/types.ts";
import { mulberry32 } from "../game/rng.ts";

const DIRECTIONS: Direction[] = ["left", "right", "up", "down"];

function randomBoard(rand: () => number): Board {
  const values = [0, 2, 2, 2, 2, 4, 4, 8, 16];
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

describe("traceMovements consistency with slideAndMerge", () => {
  it("reconstructs the exact post-move board for many random cases", () => {
    const rand = mulberry32(42);
    for (let iter = 0; iter < 500; iter++) {
      const board = randomBoard(rand);
      for (const dir of DIRECTIONS) {
        const result = moveBoard(board, dir);
        const movements = traceMovements(board, dir);

        const nonZeroSources = new Set(
          movements.map((m) => `${m.fromR},${m.fromC}`),
        );
        let expectedSourceCount = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (board[r][c] !== 0) expectedSourceCount++;
          }
        }
        expect(nonZeroSources.size).toBe(expectedSourceCount);

        const byTarget = new Map<string, number[]>();
        for (const m of movements) {
          const key = `${m.toR},${m.toC}`;
          const list = byTarget.get(key) ?? [];
          list.push(board[m.fromR][m.fromC]);
          byTarget.set(key, list);
        }

        let anyMoved = false;
        for (const [key, sources] of byTarget) {
          const [toR, toC] = key.split(",").map(Number);
          if (sources.length === 1) {
            expect(result.board[toR][toC]).toBe(sources[0]);
          } else {
            expect(sources.length).toBe(2);
            expect(sources[0]).toBe(sources[1]);
            expect(result.board[toR][toC]).toBe(sources[0] * 2);
          }
        }
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (result.board[r][c] !== 0) {
              expect(byTarget.has(`${r},${c}`)).toBe(true);
            }
          }
        }
        for (const m of movements) {
          if (m.fromR !== m.toR || m.fromC !== m.toC) anyMoved = true;
          if (m.absorbed) {
            const pair = movements.find(
              (o) =>
                o !== m && !o.absorbed && o.toR === m.toR && o.toC === m.toC,
            );
            expect(pair).toBeDefined();
          }
        }
        expect(anyMoved).toBe(result.moved);
      }
    }
  });

  it("traces a simple left slide", () => {
    const board: Board = [
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(traceMovements(board, "left")).toEqual([
      { fromR: 0, fromC: 3, toR: 0, toC: 0, absorbed: false },
    ]);
  });

  it("marks the second tile of a merge as absorbed", () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const movements = traceMovements(board, "left");
    expect(movements).toEqual([
      { fromR: 0, fromC: 0, toR: 0, toC: 0, absorbed: false },
      { fromR: 0, fromC: 1, toR: 0, toC: 0, absorbed: true },
    ]);
  });
});
