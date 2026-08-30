import { describe, it } from "vitest";
import { getBestDirection } from "../game/ai.ts";
import type { Board } from "../game/types.ts";
import { mulberry32 } from "../game/rng.ts";

function randomBoardWithEmpties(rand: () => number, targetEmpty: number): Board {
  const cells = new Array(16).fill(0) as number[];
  const fillCount = 16 - targetEmpty;
  const values = [2, 2, 2, 4, 8, 16, 32, 64];
  for (let i = 0; i < fillCount; i++) {
    let idx = Math.floor(rand() * 16);
    while (cells[idx] !== 0) idx = (idx + 1) % 16;
    cells[idx] = values[Math.floor(rand() * values.length)];
  }
  const board: Board = [];
  for (let r = 0; r < 4; r++) board.push(cells.slice(r * 4, r * 4 + 4));
  return board;
}

describe("bench", () => {
  it("times decisions on typical boards", () => {
    const rand = mulberry32(7);
    for (const empties of [12, 9, 7, 5, 3]) {
      let total = 0;
      let max = 0;
      for (let i = 0; i < 10; i++) {
        const board = randomBoardWithEmpties(rand, empties);
        const start = performance.now();
        getBestDirection(board);
        const elapsed = performance.now() - start;
        total += elapsed;
        if (elapsed > max) max = elapsed;
      }
      console.log(
        `empties=${String(empties).padStart(2)} avg=${(total / 10).toFixed(1)}ms max=${max.toFixed(1)}ms`,
      );
    }
  });
});
