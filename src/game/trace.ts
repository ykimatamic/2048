import type { Board, Direction } from "./types.ts";

export interface TileMovement {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  absorbed: boolean;
}

function lineCoords(dir: Direction, line: number, size: number): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  switch (dir) {
    case "left":
      for (let c = 0; c < size; c++) coords.push([line, c]);
      break;
    case "right":
      for (let c = size - 1; c >= 0; c--) coords.push([line, c]);
      break;
    case "up":
      for (let r = 0; r < size; r++) coords.push([r, line]);
      break;
    case "down":
      for (let r = size - 1; r >= 0; r--) coords.push([r, line]);
      break;
  }
  return coords;
}

export function traceMovements(board: Board, dir: Direction): TileMovement[] {
  const movements: TileMovement[] = [];
  const size = board.length;

  for (let line = 0; line < size; line++) {
    const coords = lineCoords(dir, line, size);

    const indices: number[] = [];
    for (let i = 0; i < coords.length; i++) {
      const [r, c] = coords[i];
      if (board[r][c] !== 0) indices.push(i);
    }

    let target = 0;
    let j = 0;
    while (j < indices.length) {
      const a = coords[indices[j]];
      const valueA = board[a[0]][a[1]];
      const bIdx = j + 1 < indices.length ? indices[j + 1] : -1;
      const b = bIdx !== -1 ? coords[bIdx] : null;
      const valueB = b ? board[b[0]][b[1]] : -1;

      const [toR, toC] = coords[target];
      if (b && valueA === valueB) {
        // 2048 ルール: 同値2枚が隣接している場合のみ1回マージする。
        // 3枚以上が連続する場合(例: [2,2,2])は先頭2枚のみマージし、3枚目は単独移動扱い。
        // したがって b を absorbed とし、次のループで j+=2 して残りを処理する。
        movements.push({ fromR: a[0], fromC: a[1], toR, toC, absorbed: false });
        movements.push({ fromR: b![0], fromC: b![1], toR, toC, absorbed: true });
        target++;
        j += 2;
      } else {
        movements.push({ fromR: a[0], fromC: a[1], toR, toC, absorbed: false });
        target++;
        j += 1;
      }
    }
  }

  return movements;
}
