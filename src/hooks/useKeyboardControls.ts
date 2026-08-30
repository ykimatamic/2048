import { useEffect, useRef } from "react";
import type { Direction } from "../game/types.ts";

interface KeyboardOptions {
  /** false を返した場合 Undo キーを無視(Auto 中など) */
  isUndoEnabled?: () => boolean;
  /** h / H キーでヒント要求(未指定なら無効) */
  requestHint?: () => void;
}

/** 矢印 / WASD で移動、z / Backspace で Undo、h で Hint。同一方向キーリピートは 80ms に制限 */
export function useKeyboardControls(
  applyMove: (dir: Direction) => void,
  undo: () => void,
  options?: KeyboardOptions,
): void {
  const cbRef = useRef({ applyMove, undo, options });
  cbRef.current = { applyMove, undo, options };

  useEffect(() => {
    // 同一方向キーリピートの最短間隔(連射による暴発を防ぐ)。
    // 80ms → 100ms に緩和し、方向変更時の操作性を改善
    const REPEAT_MIN_MS = 100;
    let lastKeyMove: { dir: Direction; time: number } | null = null;
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      };
      const direction = keyMap[e.key];
      if (direction) {
        if (e.repeat) {
          const now = performance.now();
          if (
            lastKeyMove &&
            lastKeyMove.dir === direction &&
            now - lastKeyMove.time < REPEAT_MIN_MS
          ) {
            e.preventDefault();
            return;
          }
        }
        lastKeyMove = { dir: direction, time: performance.now() };
        e.preventDefault();
        cbRef.current.applyMove(direction);
        return;
      }
      const isModifier = e.ctrlKey || e.metaKey || e.altKey;
      const isUndoKey =
        (e.key === "z" || e.key === "Z" || e.key === "Backspace") && !isModifier;
      if (isUndoKey) {
        e.preventDefault();
        const isUndoEnabled = cbRef.current.options?.isUndoEnabled;
        if (!isUndoEnabled || isUndoEnabled()) {
          cbRef.current.undo();
        }
        return;
      }
      const isHintKey = (e.key === "h" || e.key === "H") && !isModifier;
      if (isHintKey && cbRef.current.options?.requestHint) {
        e.preventDefault();
        cbRef.current.options.requestHint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
