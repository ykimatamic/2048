import type { Board, Direction } from "./types.ts";
import { getBestDirection, setDifficulty, type Difficulty } from "./ai.ts";

export type { Difficulty } from "./ai.ts";

interface PendingEntry {
  board: Board;
  resolve: (dir: Direction | null) => void;
}

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, PendingEntry>();

/** 同期フォールバック計算(ワーカー障害時と同等の結果を返す) */
function computeSync(board: Board, difficulty: Difficulty): Direction | null {
  try {
    setDifficulty(difficulty);
    return getBestDirection(board);
  } catch {
    return null;
  }
}

function getWorker(): Worker | null {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL("./ai.worker.ts", import.meta.url), {
      type: "module",
    });
    w.onmessage = (
      e: MessageEvent<{
        id: number;
        ok: boolean;
        dir?: Direction | null;
        difficulty?: Difficulty;
      }>,
    ) => {
      const entry = pending.get(e.data.id);
      if (!entry) return;
      pending.delete(e.data.id);
      if (e.data.ok) {
        entry.resolve(e.data.dir ?? null);
      } else {
        // ワーカー内で例外 → 以後は同期計算へ切り替え
        workerBroken = true;
        entry.resolve(computeSync(entry.board, currentDifficulty));
      }
    };
    w.onerror = () => {
      // ワーカーが使えない環境では同期計算にフォールバック
      workerBroken = true;
      for (const [, entry] of pending) {
        entry.resolve(computeSync(entry.board, currentDifficulty));
      }
      pending.clear();
    };
    worker = w;
    return w;
  } catch {
    workerBroken = true;
    return null;
  }
}

/** リクエストごとの難易度(ワーカー障害時の同期計算でも使用) */
let currentDifficulty: Difficulty = "normal";

/** AI の最善手を取得する。可能なら Web Worker、不可なら同期的に計算 */
export function requestDirectionAsync(
  board: Board,
  difficulty: Difficulty = "normal",
): Promise<Direction | null> {
  currentDifficulty = difficulty;
  const w = getWorker();
  if (!w) {
    return Promise.resolve(computeSync(board, difficulty));
  }
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, { board, resolve });
    w.postMessage({ id, board, difficulty });
  });
}
