import { describe, it, expect } from "vitest";
import { getBestDirection } from "../game/ai.ts";
import { initializeGame, processMove, canMove, maxTileValue } from "../game/game.ts";
import { setRandomSource } from "../game/random.ts";
import { mulberry32 } from "../game/rng.ts";
import type { Board } from "../game/types.ts";

/**
 * 5x5 盤面(フォールバックエンジン aiSimple)の自己対戦品質テスト。
 * シード固定で到達タイルの下限を検証し、評価関数/探索の弱体化を検出する。
 */

const SEEDS = [1, 2, 3];
const MOVE_CAP = 1500;
/** 5x5 では到達タイルがばらつくため、個別ゲームの下限は控えめに設定 */
const MIN_TILE_PER_GAME = 256;
const AVG_MIN_TILE = 512;

function selfPlay5x5(seed: number): { maxTile: number; moves: number; score: number } {
  const rand = mulberry32(seed);
  setRandomSource(rand);

  let board = initializeGame(5).board;
  let score = 0;
  let moves = 0;

  while (moves < MOVE_CAP && canMove(board)) {
    const dir = getBestDirection(board as Board);
    if (!dir) break;
    const result = processMove(board, dir, score);
    board = result.board;
    score = result.score;
    moves++;
  }

  return { maxTile: maxTileValue(board), moves, score };
}

describe("5x5 AI quality (fallback engine)", () => {
  it(
    "seeded self-play on 5x5 reaches a minimum tile level",
    { timeout: 600_000 },
    () => {
      const results = SEEDS.map((seed) => ({
        seed,
        ...selfPlay5x5(seed),
      }));

      for (const r of results) {
        console.log(
          `size=5 seed=${r.seed} maxTile=${r.maxTile} moves=${r.moves} score=${r.score}`,
        );
        expect(r.maxTile).toBeGreaterThanOrEqual(MIN_TILE_PER_GAME);
      }

      const avgMaxTile =
        results.reduce((sum, r) => sum + r.maxTile, 0) / results.length;
      console.log(`avgMaxTile=${avgMaxTile}`);
      expect(avgMaxTile).toBeGreaterThanOrEqual(AVG_MIN_TILE);
    },
  );
});
