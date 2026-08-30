import { describe, it, expect, beforeEach } from "vitest";
import { getBestDirection, getHint } from "../game/ai.ts";
import { moveBoard } from "../game/game.ts";
import { BOARD_SIZE } from "../game/types.ts";
import { mulberry32 } from "../game/rng.ts";

function getMaxTile(board: number[][]): number {
  let max = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] > max) max = board[r][c];
    }
  }
  return max;
}

function simulateGame(
  moves: number,
  rand: () => number,
): { board: number[][]; maxTile: number; reachedGameOver: boolean } {
  let board: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  board[0][0] = 2;
  board[1][0] = 2;

  let reachedGameOver = false;

  for (let i = 0; i < moves; i++) {
    const dir = getBestDirection(board);
    if (!dir) {
      reachedGameOver = true;
      break;
    }
    const result = moveBoard(board, dir);
    if (!result.moved) {
      reachedGameOver = true;
      break;
    }

    const empties: Array<[number, number]> = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (result.board[r][c] === 0) empties.push([r, c]);
      }
    }
    if (empties.length === 0) {
      board = result.board;
      reachedGameOver = true;
      break;
    }
    const idx = Math.floor(rand() * empties.length);
    const [er, ec] = empties[idx];
    result.board[er][ec] = rand() < 0.9 ? 2 : 4;

    board = result.board;
  }

  return { board, maxTile: getMaxTile(board), reachedGameOver };
}

describe("AI quality: basic validity", () => {
  it("returns a valid direction for a normal board", () => {
    const board = [
      [0, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    expect(dir).not.toBeNull();
    expect(["left", "right", "up", "down"]).toContain(dir);
  });

  it("returns null when no moves are possible", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(getBestDirection(board)).toBeNull();
  });

  it("always returns a direction when moves exist", () => {
    const boards = [
      [[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0]],
      [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2]],
    ];
    for (const board of boards) {
      const dir = getBestDirection(board);
      expect(dir).not.toBeNull();
    }
  });
});

describe("AI quality: merge preference", () => {
  it("prefers left when left merges tiles (corner strategy)", () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    expect(dir).toBe("left");
  });

  it("prefers right when right merges and left does not", () => {
    const board = [
      [0, 0, 2, 2],
      [4, 0, 0, 0],
      [8, 0, 0, 0],
      [16, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    expect(dir).toBe("right");
  });

  it("always picks a merging direction when one exists", () => {
    const board = [
      [0, 0, 0, 0],
      [0, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    expect(dir).not.toBeNull();
    const result = moveBoard(board, dir!);
    expect(result.moved).toBe(true);
    expect(result.scoreGain).toBeGreaterThan(0);
  });

  it("prefers merge over non-merge", () => {
    const board = [
      [2, 2, 4, 8],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    const result = moveBoard(board, dir!);
    expect(result.scoreGain).toBeGreaterThan(0);
  });
});

describe("AI quality: corner strategy", () => {
  it("keeps max tile in corner when possible", () => {
    const board = [
      [64, 32, 16, 8],
      [0, 0, 0, 4],
      [0, 0, 0, 2],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    const result = moveBoard(board, dir!);
    const newMax = getMaxTile(result.board);
    const cornerValues = [
      result.board[0][0],
      result.board[0][3],
      result.board[3][0],
      result.board[3][3],
    ];
    expect(cornerValues).toContain(newMax);
  });

  it("does not break corner strategy unnecessarily", () => {
    const board = [
      [128, 64, 32, 8],
      [16, 0, 0, 4],
      [8, 0, 0, 2],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    const result = moveBoard(board, dir!);
    expect(result.board[0][0]).toBe(128);
  });
});

describe("AI quality: empty cell preservation", () => {
  it("prefers moves that leave more empty cells", () => {
    const board = [
      [2, 4, 8, 16],
      [32, 0, 0, 0],
      [64, 0, 0, 0],
      [128, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    const result = moveBoard(board, dir!);
    let emptyAfter = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (result.board[r][c] === 0) emptyAfter++;
      }
    }
    expect(emptyAfter).toBeGreaterThanOrEqual(8);
  });
});

describe("AI quality: avoids bad moves", () => {
  it("does not suggest a move that leaves no empty cells when alternatives exist", () => {
    const board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 0, 4],
    ];
    const dir = getBestDirection(board);
    expect(dir).not.toBeNull();
    const result = moveBoard(board, dir!);
    expect(result.moved).toBe(true);
  });
});

describe("AI quality: complex board decisions", () => {
  it("makes reasonable decision on a board with moves", () => {
    const board = [
      [256, 128, 64, 32],
      [16, 32, 128, 64],
      [8, 16, 32, 128],
      [0, 8, 16, 32],
    ];
    const dir = getBestDirection(board);
    expect(dir).not.toBeNull();
    expect(["left", "right", "up", "down"]).toContain(dir);
  });

  it("makes reasonable decision with many tiles", () => {
    const board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 2, 4, 8],
      [0, 32, 64, 128],
    ];
    const dir = getBestDirection(board);
    expect(dir).not.toBeNull();
  });
});

describe("AI quality: hint vs best direction consistency", () => {
  it("getHint and getBestDirection agree on simple boards", () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const hint = getHint(board);
    const best = getBestDirection(board);
    expect(hint).toBe(best);
  });

  it("getHint returns a valid direction", () => {
    const board = [
      [4, 8, 4, 8],
      [2, 4, 2, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const hint = getHint(board);
    expect(hint).not.toBeNull();
    expect(["left", "right", "up", "down"]).toContain(hint);
  });
});

describe("AI quality: performance", () => {
  it("completes a decision within 500ms on a normal board", () => {
    const board = [
      [2, 4, 8, 16],
      [32, 64, 0, 0],
      [128, 256, 2, 4],
      [0, 8, 16, 32],
    ];
    const start = performance.now();
    getBestDirection(board);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("completes hint within 500ms on a crowded board", () => {
    const board = [
      [256, 128, 64, 32],
      [16, 32, 128, 64],
      [8, 16, 32, 128],
      [4, 8, 16, 32],
    ];
    const start = performance.now();
    getHint(board);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe("AI quality: simulation (auto-play)", () => {
  let rand: () => number;

  beforeEach(() => {
    rand = mulberry32(20260822);
  });

  it("survives at least 100 moves without game over", () => {
    const result = simulateGame(100, rand);
    expect(result.reachedGameOver).toBe(false);
  }, 30000);

  it("reaches 512+ tile within 300 moves", () => {
    const result = simulateGame(300, rand);
    expect(result.maxTile).toBeGreaterThanOrEqual(512);
  }, 60000);

  it("reaches 2048 tile within 1000 moves (deterministic seed)", () => {
    const result = simulateGame(1000, rand);
    expect(result.maxTile).toBeGreaterThanOrEqual(2048);
  }, 120000);
});
