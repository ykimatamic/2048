import { useCallback, useEffect, useRef, useState } from "react";
import type { Direction } from "../game/types.ts";
import type { GameHookState } from "./types.ts";
import { requestDirectionAsync } from "../game/aiClient.ts";
import type { Difficulty } from "../game/aiClient.ts";

interface AutoPlayerDeps {
  getState: () => GameHookState;
  applyMove: (dir: Direction) => void;
  getDelayMs: () => number;
  getDifficulty: () => Difficulty;
}

/**
 * AI オートプレイ制御。
 * - toggle/stop で手動操作
 * - タブ非表示中は自動停止し、復帰時に自動再開
 * - deactivate で再開フラグも含めて完全に無効化(reset 用)
 */
export function useAutoPlayer(deps: AutoPlayerDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef(false);
  const autoResumeRef = useRef(false);

  const stopAutoPlay = useCallback(() => {
    setAutoPlay(false);
    autoPlayRef.current = false;
  }, []);

  /** reset 等でゲームを初期化する際に呼ぶ(自動再開も抑止) */
  const deactivate = useCallback(() => {
    setAutoPlay(false);
    autoPlayRef.current = false;
    autoResumeRef.current = false;
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      const next = !prev;
      autoPlayRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!autoPlay) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const step = () => {
      if (cancelled || !autoPlayRef.current) return;
      const s = depsRef.current.getState();
      // ゲームオーバー、または 2048 到達(You Win オーバーレイ表示中)で停止
      if (s.gameOver || (s.won && !s.keepPlaying)) {
        stopAutoPlay();
        return;
      }
      const moveCountAtRequest = s.moveCount;
      void requestDirectionAsync(
        s.board,
        depsRef.current.getDifficulty(),
      ).then((dir) => {
        if (cancelled || !autoPlayRef.current) return;
        if (!dir) {
          stopAutoPlay();
          return;
        }
        const cur = depsRef.current.getState();
        if (cur.gameOver || (cur.won && !cur.keepPlaying)) {
          stopAutoPlay();
          return;
        }
        if (cur.moveCount !== moveCountAtRequest) {
          // 手動操作が割り込んだためこの応答は破棄して次へ
          timer = setTimeout(step, 0);
          return;
        }
        depsRef.current.applyMove(dir);
        if (!cancelled && autoPlayRef.current) {
          timer = setTimeout(step, depsRef.current.getDelayMs());
        }
      });
    };

    timer = setTimeout(step, 0);
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [autoPlay, stopAutoPlay]);

  // タブ非表示中は Auto を停止し、復帰時に自動再開する
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (autoPlayRef.current) {
          autoResumeRef.current = true;
          stopAutoPlay();
        }
      } else if (autoResumeRef.current) {
        autoResumeRef.current = false;
        setAutoPlay(true);
        autoPlayRef.current = true;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [stopAutoPlay]);

  return { autoPlay, stopAutoPlay, toggleAutoPlay, deactivate };
}
