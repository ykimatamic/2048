import { useEffect } from "react";
import type { Board } from "../game/types.ts";
import { canMove } from "../game/game.ts";
import type { GameHookState } from "./types.ts";

const STORAGE_KEY = "game2048:v1";

export const VALID_BOARD_SIZES = [3, 4, 5] as const;

interface SavedData {
  size?: number;
  board: Board;
  score: number;
  best: number;
  moveCount: number;
  won: boolean;
  keepPlaying: boolean;
}

/** タイル値として有効(0 または 2 以上の 2 の冪) */
function isValidTileValue(v: number): boolean {
  return v === 0 || (v >= 2 && v <= 131072 && (v & (v - 1)) === 0);
}

/** タイル値を最も近い2の冪に修正する(0はそのまま) */
function repairTileValue(v: number): number {
  if (v === 0) return 0;
  if (isValidTileValue(v)) return v;
  let power = 2;
  while (power < v && power <= 131072) power *= 2;
  const lower = power / 2;
  return v - lower < power - v ? lower : Math.min(power, 131072);
}

/** ボードの全タイル値を検証し、不正値は修復する */
function sanitizeBoard(board: Board): Board {
  return board.map((row) => row.map((v) => (isValidTileValue(v) ? v : repairTileValue(v))));
}

function isValidBoard(board: unknown, size: number): board is Board {
  return (
    Array.isArray(board) &&
    board.length === size &&
    board.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size &&
        row.every((v) => typeof v === "number" && Number.isInteger(v) && isValidTileValue(v)),
    )
  );
}

export function loadSaved(): { state: GameHookState; best: number; size: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let data = JSON.parse(raw) as SavedData;
    // サイズ未記録の旧セーブデータは 4x4 扱い
    const size = typeof data.size === "number" ? data.size : 4;
    if (!VALID_BOARD_SIZES.includes(size as (typeof VALID_BOARD_SIZES)[number])) {
      return null;
    }
    if (
      typeof data.score !== "number" ||
      typeof data.best !== "number" ||
      typeof data.moveCount !== "number"
    ) {
      return null;
    }
    // ボードが不正な場合は修復を試み、修復不可なら破棄
    if (!isValidBoard(data.board, size)) {
      const repaired = sanitizeBoard(data.board);
      if (!isValidBoard(repaired, size)) {
        return null;
      }
      data = { ...data, board: repaired };
    }
    const gameOver = !canMove(data.board);
    return {
      state: {
        board: data.board,
        size,
        score: data.score,
        gameOver,
        won: Boolean(data.won),
        keepPlaying: Boolean(data.keepPlaying),
        moveCount: data.moveCount,
      },
      best: Math.max(data.best, data.score),
      size,
    };
  } catch {
    return null;
  }
}

function saveData(state: GameHookState, best: number): void {
  try {
    const data: SavedData = {
      size: state.size,
      board: sanitizeBoard(state.board),
      score: state.score,
      best,
      moveCount: state.moveCount,
      won: state.won,
      keepPlaying: state.keepPlaying,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ストレージ利用不可の環境では無視
  }
}

/** ゲーム状態を localStorage へ永続化する */
export function usePersistence(state: GameHookState, bestScore: number): void {
  useEffect(() => {
    saveData(state, bestScore);
  }, [state, bestScore]);
}
