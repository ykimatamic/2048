import type { Board } from "./types.ts";
import { getEmptyPositions, cloneBoard } from "./board.ts";
import type { RandomFn } from "./rng.ts";

let randomSource: RandomFn = Math.random;

/** 乱数源を差し替える(テストの決定性確保用)。null で既定に戻す */
export function setRandomSource(fn: RandomFn | null): void {
  randomSource = fn ?? Math.random;
}

export function addRandomTile(board: Board): Board {
  const emptyPositions = getEmptyPositions(board);
  if (emptyPositions.length === 0) return board;

  const newBoard = cloneBoard(board);
  const index = Math.floor(randomSource() * emptyPositions.length);
  const [r, c] = emptyPositions[index];
  newBoard[r][c] = randomSource() < 0.9 ? 2 : 4;
  return newBoard;
}
