import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Game } from "../components/Game.tsx";
import type { Board } from "../game/types.ts";

function getBoardFromDom(): Board {
  // .board 内の静的セル(n*n 個)の後ろに tile-view が並ぶ
  const boardEl = document.querySelector(".board")!;
  const n = Number((boardEl as HTMLElement).dataset.n ?? "4");
  const views = boardEl.querySelectorAll(".tile-view");
  const board: Board = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  views.forEach((el) => {
    const style = (el as HTMLElement).style;
    const r = Number(style.getPropertyValue("--r"));
    const c = Number(style.getPropertyValue("--c"));
    const value = Number(el.querySelector(".tile")!.textContent);
    if (!Number.isNaN(r) && !Number.isNaN(c)) {
      board[r][c] = value;
    }
  });
  return board;
}

function countTiles(): number {
  return document.querySelectorAll(".tile-view").length;
}

function pressKey(key: string): void {
  act(() => {
    fireEvent.keyDown(window, { key });
  });
}

describe("Game component smoke test", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders title and initial tiles", () => {
    render(<Game />);
    expect(screen.getByText("2048")).toBeDefined();
    expect(countTiles()).toBe(2);
  });

  it("moves tiles with arrow keys and adds a spawn", () => {
    localStorage.clear();
    // 既知の初期状態を作る
    localStorage.setItem(
      "game2048:v1",
      JSON.stringify({
        board: [
          [2, 2, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 0,
        best: 0,
        moveCount: 0,
        won: false,
        keepPlaying: false,
      }),
    );
    const { unmount } = render(<Game />);
    expect(getBoardFromDom()[0].slice(0, 2)).toEqual([2, 2]);

    pressKey("ArrowLeft");
    // マージで 4 になり、スポーンが追加 → タイルは 2 個
    let board = getBoardFromDom();
    expect(board[0][0]).toBe(4);
    expect(countTiles()).toBe(2);

    pressKey("ArrowUp"); // 動かせない場合もあるためタイル数のみ確認
    board = getBoardFromDom();
    expect(countTiles()).toBeGreaterThanOrEqual(2);
    unmount();
  });

  it("undo restores the previous board", () => {
    localStorage.setItem(
      "game2048:v1",
      JSON.stringify({
        board: [
          [2, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 4],
        ],
        score: 0,
        best: 0,
        moveCount: 3,
        won: false,
        keepPlaying: false,
      }),
    );
    render(<Game />);
    expect(getBoardFromDom()).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 4],
    ]);

    pressKey("ArrowLeft");
    const afterMove = getBoardFromDom();
    expect(afterMove[0][0]).toBe(2);
    expect(afterMove[3][0]).toBe(4);

    const undoButton = screen.getByText("Undo") as HTMLButtonElement;
    expect(undoButton.disabled).toBe(false);
    act(() => {
      fireEvent.click(undoButton);
    });
    expect(getBoardFromDom()).toEqual([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 4],
    ]);
  });

  it("shows win overlay with Keep going and continues play", () => {
    localStorage.setItem(
      "game2048:v1",
      JSON.stringify({
        board: [
          [1024, 1024, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 10000,
        best: 10000,
        moveCount: 500,
        won: false,
        keepPlaying: false,
      }),
    );
    render(<Game />);
    pressKey("ArrowLeft"); // 2048 を作る
    expect(screen.getByText("You Win!")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Keep going"));
    });
    expect(screen.queryByText("You Win!")).toBeNull();
    // 続行後もオーバーレイは再表示されない
    pressKey("ArrowUp");
    expect(screen.queryByText("You Win!")).toBeNull();
  });

  it("persists state to localStorage after a move", () => {
    localStorage.setItem(
      "game2048:v1",
      JSON.stringify({
        board: [
          [2, 2, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 0,
        best: 0,
        moveCount: 0,
        won: false,
        keepPlaying: false,
      }),
    );
    render(<Game />);
    pressKey("ArrowLeft");
    const raw = localStorage.getItem("game2048:v1")!;
    const data = JSON.parse(raw);
    expect(data.score).toBe(4);
    expect(data.moveCount).toBe(1);
    expect(data.best).toBeGreaterThanOrEqual(4);
  });

  it("ignores saved boards containing non-power-of-two values", () => {
    localStorage.setItem(
      "game2048:v1",
      JSON.stringify({
        board: [
          [3, 2, 0, 0],
          [0, 7, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, -2],
        ],
        score: 999,
        best: 999,
        moveCount: 10,
        won: false,
        keepPlaying: false,
      }),
    );
    render(<Game />);
    // 破損データは無視され新規ゲーム(タイル 2 個)になる
    expect(countTiles()).toBe(2);
    const board = getBoardFromDom();
    const values = board.flat().filter((v) => v > 0);
    expect(values.length).toBe(2);
    for (const v of values) {
      expect([2, 4]).toContain(v);
    }
  });

  it("supports 3x3 boards", () => {
    localStorage.setItem(
      "game2048:v1",
      JSON.stringify({
        size: 3,
        board: [
          [2, 2, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        score: 0,
        best: 0,
        moveCount: 0,
        won: false,
        keepPlaying: false,
      }),
    );
    render(<Game />);
    expect(document.querySelectorAll(".cell").length).toBe(9);

    pressKey("ArrowLeft");
    const board = getBoardFromDom();
    expect(board.length).toBe(3);
    expect(board[0][0]).toBe(4);

    // サイズ切替ボタンで 5x5 に変更
    act(() => {
      fireEvent.click(screen.getByText("5x5"));
    });
    expect(document.querySelectorAll(".cell").length).toBe(25);
    expect(getBoardFromDom().length).toBe(5);
  });
});
