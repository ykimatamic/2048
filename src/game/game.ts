import type { Board, Direction, MoveResult } from "./types.ts";
import { BOARD_SIZE } from "./types.ts";
import { moveLeft, moveRight, moveUp, moveDown } from "./move.ts";
import { cloneBoard, createEmptyBoard } from "./board.ts";
import { addRandomTile } from "./random.ts";

export function moveBoard(board: Board, direction: Direction): MoveResult {
  switch (direction) {
    case "left":
      return moveLeft(board);
    case "right":
      return moveRight(board);
    case "up":
      return moveUp(board);
    case "down":
      return moveDown(board);
  }
}

export function hasWon(board: Board): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 2048) return true;
    }
  }
  return false;
}

/**
 * 盤面上で可能な移動が1つでもあるかを判定する。
 * 空きセルがある場合、または隣接する同値タイルがある場合に true を返す。
 * gameOver 状態(= canMove が false)で移動が試行された場合、
 * moveBoard は moved: false を返し、呼び出し元は入力を無視する。
 */
export function canMove(board: Board): boolean {
  const n = board.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < board[r].length && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < n && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export function isGameOver(board: Board): boolean {
  return !canMove(board);
}

export function calculateTotalScore(board: Board): number {
  let total = 0;
  for (const row of board) {
    for (const v of row) {
      total += v;
    }
  }
  return total;
}

export function maxTileValue(board: Board): number {
  let max = 0;
  for (const row of board) {
    for (const v of row) {
      if (v > max) max = v;
    }
  }
  return max;
}

export function processMove(board: Board, direction: Direction, currentScore: number): {
  board: Board;
  score: number;
  moved: boolean;
  scoreGain: number;
  won: boolean;
  gameOver: boolean;
} {
  const result = moveBoard(board, direction);
  if (!result.moved) {
    return {
      board,
      score: currentScore,
      moved: false,
      scoreGain: 0,
      won: false,
      gameOver: false,
    };
  }

  const mergedBoard = result.board;
  // マージ後のボードで移動可能か確認（スポーン前の状態確認）
  const canMoveAfterMerge = canMove(mergedBoard);
  const newBoard = addRandomTile(cloneBoard(mergedBoard));
  const newScore = currentScore + result.scoreGain;
  const won = hasWon(newBoard);
  // スポーン後のボードで gameOver を最終判定
  // マージ後に既に移動不能の場合、新しいタイルを追加しても移動不能は確定
  const gameOver = canMoveAfterMerge ? isGameOver(newBoard) : true;

  return {
    board: newBoard,
    score: newScore,
    moved: true,
    scoreGain: result.scoreGain,
    won,
    gameOver,
  };
}

export function placeTile(board: Board, r: number, c: number, value: number): Board {
  const newBoard = cloneBoard(board);
  newBoard[r][c] = value;
  return newBoard;
}

export function initializeGame(size: number = BOARD_SIZE): { board: Board; score: number } {
  let board = createEmptyBoard(size);
  board = addRandomTile(board);
  board = addRandomTile(board);
  return { board, score: 0 };
}
