import { describe, it, expect } from "vitest";
import { moveLeft, moveRight, moveUp, moveDown } from "../game/move.ts";
import { isGameOver, hasWon, processMove, initializeGame } from "../game/game.ts";

describe("moveLeft", () => {
  it("does not move when no tiles can slide", () => {
    const board = [
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.moved).toBe(false);
  });

  it("slides tiles to the left", () => {
    const board = [
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.moved).toBe(true);
  });

  it("merges two adjacent equal tiles", () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.scoreGain).toBe(4);
  });

  it("merges only once per move (no chain merging)", () => {
    const board = [
      [2, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [4, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.scoreGain).toBe(4);
  });

  it("merges two pairs correctly", () => {
    const board = [
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [4, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.scoreGain).toBe(8);
  });

  it("merges different value pairs correctly", () => {
    const board = [
      [4, 4, 8, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [8, 16, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.scoreGain).toBe(24);
  });

  it("handles full row with no merges", () => {
    const board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.moved).toBe(false);
  });

  it("processes all rows independently", () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 4, 4],
      [2, 0, 0, 2],
      [8, 8, 8, 0],
    ];
    const result = moveLeft(board);
    expect(result.board).toEqual([
      [4, 0, 0, 0],
      [8, 0, 0, 0],
      [4, 0, 0, 0],
      [16, 8, 0, 0],
    ]);
  });
});

describe("moveRight", () => {
  it("slides tiles to the right", () => {
    const board = [
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveRight(board);
    expect(result.board).toEqual([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });

  it("merges tiles to the right", () => {
    const board = [
      [0, 0, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveRight(board);
    expect(result.board).toEqual([
      [0, 0, 0, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });

  it("merges two pairs correctly to the right", () => {
    const board = [
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveRight(board);
    expect(result.board).toEqual([
      [0, 0, 4, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });
});

describe("moveUp", () => {
  it("slides tiles upward", () => {
    const board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
    ];
    const result = moveUp(board);
    expect(result.board).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });

  it("merges tiles upward", () => {
    const board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveUp(board);
    expect(result.board).toEqual([
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(result.scoreGain).toBe(4);
  });

  it("merges two pairs upward", () => {
    const board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
    ];
    const result = moveUp(board);
    expect(result.board).toEqual([
      [4, 0, 0, 0],
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });
});

describe("moveDown", () => {
  it("slides tiles downward", () => {
    const board = [
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = moveDown(board);
    expect(result.board).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
    ]);
  });

  it("merges tiles downward", () => {
    const board = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
    ];
    const result = moveDown(board);
    expect(result.board).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
    ]);
  });
});

describe("isGameOver", () => {
  it("returns false when there are empty cells", () => {
    const board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 0],
    ];
    expect(isGameOver(board)).toBe(false);
  });

  it("returns false when there are adjacent equal tiles", () => {
    const board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 32],
    ];
    expect(isGameOver(board)).toBe(false);
  });

  it("returns true when no moves are possible", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(isGameOver(board)).toBe(true);
  });
});

describe("hasWon", () => {
  it("returns true when 2048 tile exists", () => {
    const board = [
      [2048, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(hasWon(board)).toBe(true);
  });

  it("returns false when 2048 tile does not exist", () => {
    const board = [
      [1024, 512, 256, 128],
      [64, 32, 16, 8],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
    ];
    expect(hasWon(board)).toBe(false);
  });
});

describe("processMove", () => {
  it("adds a new tile after a valid move", () => {
    const board = [
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = processMove(board, "left", 0);
    expect(result.moved).toBe(true);
    expect(result.score).toBe(0);
    const nonZeroCount = result.board.flat().filter((v) => v !== 0).length;
    expect(nonZeroCount).toBe(2);
  });

  it("does not add a new tile when move is invalid", () => {
    const board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = processMove(board, "left", 0);
    expect(result.moved).toBe(false);
    expect(result.board).toEqual(board);
  });

  it("accumulates score correctly", () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const result = processMove(board, "left", 100);
    expect(result.score).toBe(104);
  });
});

describe("initializeGame", () => {
  it("creates a board with exactly 2 non-zero tiles", () => {
    const game = initializeGame();
    const nonZeroCount = game.board.flat().filter((v) => v !== 0).length;
    expect(nonZeroCount).toBe(2);
    expect(game.score).toBe(0);
  });
});
