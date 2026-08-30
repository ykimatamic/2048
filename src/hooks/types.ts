import type { Board } from "../game/types.ts";

export interface GameHookState {
  board: Board;
  /** 盤面の一辺の長さ(3 / 4 / 5) */
  size: number;
  score: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean;
  moveCount: number;
}

export interface TileView {
  id: number;
  value: number;
  r: number;
  c: number;
  isNew: boolean;
  merged: boolean;
}

export interface ScorePopup {
  amount: number;
  key: number;
}
