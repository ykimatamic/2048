import type { CSSProperties } from "react";
import type { Board } from "../game/types.ts";
import type { TileView } from "../hooks/useGame.ts";

interface BoardProps {
  board: Board;
  tiles: TileView[];
}

function digitClass(value: number): string {
  const len = String(value).length;
  if (len <= 2) return "";
  return ` tile-len-${Math.min(len, 6)}`;
}

export function Board({ board, tiles }: BoardProps) {
  return (
    <div
      className="board"
      data-n={board.length}
      style={{ "--n": board.length } as CSSProperties}
      role="grid"
      aria-label={`${board.length}x${board.length} ゲーム盤面`}
    >
      {board.map((row, r) =>
        row.map((_, c) => <div key={`${r}-${c}`} className="cell" role="gridcell" />),
      )}
      <div className="tile-layer">
        {tiles.map((t) => (
          <div
            key={t.id}
            className="tile-view"
            style={{ "--r": t.r, "--c": t.c } as CSSProperties}
          >
            <span
              className={`tile tile-${t.value}${digitClass(t.value)}${
                t.isNew ? " tile-new" : ""
              }${t.merged ? " tile-merged" : ""}`}
              role="gridcell"
              aria-label={`セル ${t.r + 1}行${t.c + 1}列: ${t.value}`}
            >
              {t.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
