import { useCallback, useRef, useState } from "react";

export interface SizeStat {
  /** 終了(ゲームオーバー)まで到達したゲーム数 */
  games: number;
  wins: number;
  bestScore: number;
  bestTile: number;
  totalMoves: number;
}

export type StatsMap = Record<number, SizeStat>;

const STATS_KEY = "game2048:stats";

function loadStats(): StatsMap {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: StatsMap = {};
    for (const [size, stat] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(size);
      if (!Number.isInteger(n) || n < 2 || typeof stat !== "object" || stat === null) continue;
      const s = stat as Partial<SizeStat>;
      out[n] = {
        games: Number(s.games) || 0,
        wins: Number(s.wins) || 0,
        bestScore: Number(s.bestScore) || 0,
        bestTile: Math.max(Number(s.bestTile) || 0, 0),
        totalMoves: Number(s.totalMoves) || 0,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function persist(stats: StatsMap): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // 保存できなくても統計表示は継続
  }
}

export interface GameEndSummary {
  size: number;
  score: number;
  won: boolean;
  maxTile: number;
  moves: number;
}

/** サイズ別の完了ゲーム統計(localStorage 永続化) */
export function useStats() {
  const [stats, setStats] = useState<StatsMap>(loadStats);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const recordGameEnd = useCallback((summary: GameEndSummary) => {
    const { size, score, won, maxTile, moves } = summary;
    const prev =
      statsRef.current[size] ??
      ({ games: 0, wins: 0, bestScore: 0, bestTile: 0, totalMoves: 0 } satisfies SizeStat);
    const next: SizeStat = {
      games: prev.games + 1,
      wins: prev.wins + (won ? 1 : 0),
      bestScore: Math.max(prev.bestScore, score),
      bestTile: Math.max(prev.bestTile, maxTile),
      totalMoves: prev.totalMoves + moves,
    };
    const updated: StatsMap = { ...statsRef.current, [size]: next };
    persist(updated);
    statsRef.current = updated;
    setStats(updated);
  }, []);

  const clearStats = useCallback(() => {
    persist({});
    statsRef.current = {};
    setStats({});
  }, []);

  return { stats, recordGameEnd, clearStats };
}
