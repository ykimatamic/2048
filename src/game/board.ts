import { BOARD_SIZE } from "./types.ts";

export function createEmptyBoard(size: number = BOARD_SIZE): number[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
}

export function getEmptyPositions(board: number[][]): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 0) {
        positions.push([r, c]);
      }
    }
  }
  return positions;
}

export function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}
