import type { Board, Direction } from "./types.ts";
import { getBestDirection, setDifficulty, type Difficulty } from "./ai.ts";

export interface AiRequest {
  id: number;
  board: Board;
  difficulty?: Difficulty;
}

export interface AiResponse {
  id: number;
  ok: boolean;
  dir?: Direction | null;
}

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, board, difficulty } = e.data;
  try {
    setDifficulty(difficulty ?? "normal");
    const dir = getBestDirection(board);
    const response: AiResponse = { id, ok: true, dir };
    (self as unknown as Worker).postMessage(response);
  } catch {
    const response: AiResponse = { id, ok: false };
    (self as unknown as Worker).postMessage(response);
  }
};
