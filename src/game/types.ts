export const BOARD_SIZE = 4;

export type Tile = number;

export type Board = Tile[][];

export type Direction = "up" | "down" | "left" | "right";

export interface GameState {
  board: Board;
  score: number;
  gameOver: boolean;
  won: boolean;
}

export interface MoveResult {
  board: Board;
  scoreGain: number;
  moved: boolean;
}
