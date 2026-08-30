import { describe, it, expect } from "vitest";
import { initializeGame, processMove, canMove } from "../game/game.ts";
import { moveLeft } from "../game/move.ts";
import { traceMovements } from "../game/trace.ts";
import { getBestDirection } from "../game/ai.ts";
import { setRandomSource } from "../game/random.ts";
import { mulberry32 } from "../game/rng.ts";

describe("variable board size", () => {
  it("initializes a 3x3 game with two tiles", () => {
    const rand = mulberry32(42);
    setRandomSource(rand);
    const { board, score } = initializeGame(3);
    expect(score).toBe(0);
    expect(board.length).toBe(3);
    for (const row of board) expect(row.length).toBe(3);
    const filled = board.flat().filter((v) => v !== 0).length;
    expect(filled).toBe(2);
  });

  it("initializes a 5x5 game with two tiles", () => {
    const rand = mulberry32(43);
    setRandomSource(rand);
    const { board } = initializeGame(5);
    expect(board.length).toBe(5);
    expect(board.flat().filter((v) => v !== 0).length).toBe(2);
  });

  it("merges and pads rows on a 5-wide board", () => {
    const board = [
      [2, 2, 4, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 8],
    ];
    const result = moveLeft(board);
    expect(result.board[0]).toEqual([4, 4, 0, 0, 0]);
    expect(result.board[4]).toEqual([8, 0, 0, 0, 0]);
    expect(result.scoreGain).toBe(4);
    expect(result.moved).toBe(true);
  });

  it("processes moves on a 3x3 board and spawns a tile", () => {
    const rand = mulberry32(44);
    setRandomSource(rand);
    let board = [
      [2, 2, 0],
      [0, 0, 0],
      [0, 0, 4],
    ];
    const before = board.flat().filter((v) => v !== 0).length;
    const result = processMove(board, "left", 0);
    expect(result.moved).toBe(true);
    const after = result.board.flat().filter((v) => v !== 0).length;
    // マージで -1、スポーンで +1
    expect(after).toBe(before);
    expect(result.board.length).toBe(3);
    board = result.board;
    expect(canMove(board)).toBe(true);
  });

  it("traces movements on a 3x3 board", () => {
    const board = [
      [2, 2, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    const movements = traceMovements(board, "left");
    // 左列に 2 枚が集まり、1 枚は吸収される
    expect(movements.length).toBe(2);
    expect(movements.filter((m) => m.absorbed).length).toBe(1);
    expect(movements.every((m) => m.toR === 0 && m.toC === 0)).toBe(true);
  });

  it("returns valid directions on non-4x4 boards via the simple engine", () => {
    const b3 = [
      [2, 2, 0],
      [0, 0, 0],
      [0, 0, 4],
    ];
    const dir3 = getBestDirection(b3);
    expect(["left", "right", "up", "down"]).toContain(dir3);

    const b5 = [
      [2, 2, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 4, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 8, 8],
    ];
    const dir5 = getBestDirection(b5);
    expect(["left", "right", "up", "down"]).toContain(dir5);
  });
});
