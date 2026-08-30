import { describe, it, expect, afterEach } from "vitest";
import {
  getBestDirection,
  getHint,
  setDifficulty,
  getDifficulty,
} from "../game/ai.ts";

describe("getBestDirection", () => {
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
    const dir = getBestDirection(board);
    expect(dir).toBeNull();
  });

  it("prefers merging when possible", () => {
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const dir = getBestDirection(board);
    expect(dir).toBe("left");
  });
});

describe("getHint", () => {
  it("returns a valid direction", () => {
    const board = [
      [0, 0, 0, 0],
      [0, 2, 4, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const dir = getHint(board);
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
    const dir = getHint(board);
    expect(dir).toBeNull();
  });
});

describe("difficulty", () => {
  afterEach(() => {
    setDifficulty("normal");
  });

  it("defaults to normal and round-trips set/get", () => {
    expect(getDifficulty()).toBe("normal");
    setDifficulty("easy");
    expect(getDifficulty()).toBe("easy");
    setDifficulty("hard");
    expect(getDifficulty()).toBe("hard");
  });

  it("returns valid directions at every difficulty", () => {
    const board = [
      [2, 0, 2, 0],
      [0, 4, 0, 0],
      [0, 0, 8, 0],
      [0, 0, 0, 16],
    ];
    for (const d of ["easy", "normal", "hard"] as const) {
      setDifficulty(d);
      const dir = getBestDirection(board);
      expect(["left", "right", "up", "down"]).toContain(dir);
    }
  });

  it("easy prefers an immediate merge on a simple board", () => {
    setDifficulty("easy");
    const board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(getBestDirection(board)).toBe("left");
  });
});
