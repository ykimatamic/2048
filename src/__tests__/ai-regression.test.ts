import { describe, it, expect } from "vitest";
import { getBestDirection } from "../game/ai.ts";
import { initializeGame, processMove, canMove } from "../game/game.ts";
import { setRandomSource } from "../game/random.ts";
import { mulberry32 } from "../game/rng.ts";
import type { Board } from "../game/types.ts";

/**
 * AI 性能リグレッション ベンチ。
 * シード固定で自己対戦し、到達タイルが閾値を下回ったら
 * 評価関数/探索の変更による弱体化を検出する。
 */

const SEEDS = [1, 2, 3];
const MOVE_CAP = 1000;

function maxTileOf(board: Board): number {
  let max = 0;
  for (const row of board) {
    for (const v of row) {
      if (v > max) max = v;
    }
  }
  return max;
}

function selfPlay(seed: number): { maxTile: number; moves: number; score: number } {
  const rand = mulberry32(seed);
  setRandomSource(rand);

  let board = initializeGame().board;
  let score = 0;
  let moves = 0;

  while (moves < MOVE_CAP && canMove(board)) {
    const dir = getBestDirection(board);
    if (!dir) break;
    const result = processMove(board, dir, score);
    board = result.board;
    score = result.score;
    moves++;
  }

  return { maxTile: maxTileOf(board), moves, score };
}

describe("AI regression bench", () => {
  it(
    "seeded self-play maintains strength",
    { timeout: 600_000 },
    () => {
      const results = SEEDS.map((seed) => ({
        seed,
        ...selfPlay(seed),
      }));

      for (const r of results) {
        console.log(
          `seed=${r.seed} maxTile=${r.maxTile} moves=${r.moves} score=${r.score}`,
        );
        // 個別ゲームの下限(弱体化の早期検出)
        expect(r.maxTile).toBeGreaterThanOrEqual(256);
      }

      // 平均到達タイルの下限(現行実装の平均はこれを大きく上回る)
      const avgMaxTile =
        results.reduce((sum, r) => sum + r.maxTile, 0) / results.length;
      console.log(`avgMaxTile=${avgMaxTile}`);
      expect(avgMaxTile).toBeGreaterThanOrEqual(1024);
    },
  );
});
