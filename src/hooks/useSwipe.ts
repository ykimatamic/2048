import { useCallback, useRef } from "react";
import type { Direction } from "../game/types.ts";

const MIN_SWIPE_PX = 30;

/** スワイプ操作でタイルを動かすためのタッチハンドラ */
export function useSwipe(onSwipe: (dir: Direction) => void) {
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < MIN_SWIPE_PX && absDy < MIN_SWIPE_PX) return;

    if (absDx > absDy) {
      onSwipeRef.current(dx > 0 ? "right" : "left");
    } else {
      onSwipeRef.current(dy > 0 ? "down" : "up");
    }
  }, []);

  return { handleTouchStart, handleTouchEnd };
}
