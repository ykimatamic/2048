import { useCallback, useRef, useState } from "react";
import type { GameHookState, TileView } from "./types.ts";

const HISTORY_LIMIT = 32;

export interface HistoryEntry {
  state: GameHookState;
  tiles: TileView[];
}

/** Undo 用の履歴スタック(HISTORY_LIMIT 手まで) */
export function useHistory() {
  const historyRef = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const push = useCallback((entry: HistoryEntry) => {
    historyRef.current.push(entry);
    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  const pop = useCallback((): HistoryEntry | undefined => {
    const entry = historyRef.current.pop();
    if (entry) {
      setCanUndo(historyRef.current.length > 0);
    }
    return entry;
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  return { canUndo, push, pop, clear };
}
