import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, Direction } from "../game/types.ts";
import { BOARD_SIZE as DEFAULT_BOARD_SIZE } from "../game/types.ts";
import { initializeGame, maxTileValue, processMove } from "../game/game.ts";
import type { Difficulty } from "../game/aiClient.ts";
import { requestDirectionAsync } from "../game/aiClient.ts";
import { traceMovements } from "../game/trace.ts";
import {
  isMuted,
  playGameOver,
  playMerge,
  playWin,
  setMuted,
} from "../game/sounds.ts";
import type { GameHookState, TileView, ScorePopup } from "./types.ts";
import { loadSaved, usePersistence } from "./usePersistence.ts";
import { useHistory } from "./useHistory.ts";
import { useAutoPlayer } from "./useAutoPlayer.ts";
import { useKeyboardControls } from "./useKeyboardControls.ts";
import { useSwipe } from "./useSwipe.ts";
import { useStats } from "./useStats.ts";

// 後方互換のため型を再エクスポート
export type { GameHookState, TileView, ScorePopup } from "./types.ts";

const DIFFICULTY_KEY = "game2048:difficulty";

let nextTileId = 1;

function buildTiles(board: Board, isNew: boolean): TileView[] {
  const tiles: TileView[] = [];
  const n = board.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] !== 0) {
        tiles.push({ id: nextTileId++, value: board[r][c], r, c, isNew, merged: false });
      }
    }
  }
  return tiles;
}

interface InitialGameData {
  state: GameHookState;
  tiles: TileView[];
  best: number;
}

function createInitialGameData(): InitialGameData {
  const saved = loadSaved();
  if (saved) {
    return { state: saved.state, tiles: buildTiles(saved.state.board, false), best: saved.best };
  }
  const size = DEFAULT_BOARD_SIZE;
  const { board, score } = initializeGame(size);
  return {
    state: { board, size, score, gameOver: false, won: false, keepPlaying: false, moveCount: 0 },
    tiles: buildTiles(board, true),
    best: 0,
  };
}

export function useGame() {
  const initRef = useRef<InitialGameData | undefined>(undefined);
  if (initRef.current === undefined) {
    initRef.current = createInitialGameData();
  }
  const init = initRef.current;

  const [state, setState] = useState<GameHookState>(init.state);
  const [bestScore, setBestScore] = useState(init.best);
  const [tiles, setTiles] = useState<TileView[]>(init.tiles);
  const [scorePopup, setScorePopup] = useState<ScorePopup | null>(null);
  // Undo 後の再マーブでも moveCount が重複する可能性があるため、
  // スコアポップアップ用の一意キーを専用カウンターで管理する
  const scorePopupKeyRef = useRef(0);

  // AI 難易度(localStorage 永続化)
  const [difficulty, setDifficultyState] = useState<Difficulty>(() => {
    try {
      const v = localStorage.getItem(DIFFICULTY_KEY);
      if (v === "easy" || v === "normal" || v === "hard") return v;
    } catch {
      // 復元できない場合は normal
    }
    return "normal";
  });
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    try {
      localStorage.setItem(DIFFICULTY_KEY, d);
    } catch {
      // 保存できなくても難易度適用は継続
    }
  }, []);

  // stateRef / tilesRef は useCallback 内から最新状態にアクセスするために使用。
  // レンダリング中に直接代入することで、useCallback の依存配列に state/tiles を含めず
  // 不要な再生成を防ぐ（ CALLBACK の安定性を維持するためのパターン）。
  const stateRef = useRef(state);
  const tilesRef = useRef(tiles);
  useEffect(() => {
    stateRef.current = state;
    tilesRef.current = tiles;
  });

  const { stats, recordGameEnd } = useStats();

  useEffect(() => {
    if (state.score > bestScore) {
      setBestScore(state.score);
    }
  }, [state.score, bestScore]);

  usePersistence(state, bestScore);

  const history = useHistory();

  // ヒント(約 3 秒で自動クリア)
  const HINT_AUTO_CLEAR_MS = 3000;
  const [hint, setHint] = useState<Direction | null>(null);
  const hintPendingRef = useRef(false);
  const [hintPending, setHintPending] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearHint = useCallback(() => {
    if (hintTimerRef.current !== undefined) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = undefined;
    }
    setHint(null);
  }, []);

  useEffect(
    () => () => {
      if (hintTimerRef.current !== undefined) clearTimeout(hintTimerRef.current);
    },
    [],
  );

  const requestHint = useCallback(() => {
    if (stateRef.current.gameOver || hintPendingRef.current) return;
    hintPendingRef.current = true;
    setHintPending(true);
    const snapshotBoard = stateRef.current.board;
    void requestDirectionAsync(snapshotBoard, difficultyRef.current).then((dir) => {
      hintPendingRef.current = false;
      setHintPending(false);
      if (stateRef.current.board === snapshotBoard && dir) {
        setHint(dir);
        hintTimerRef.current = setTimeout(() => {
          hintTimerRef.current = undefined;
          setHint(null);
        }, HINT_AUTO_CLEAR_MS);
      }
    });
  }, []);

  const applyState = useCallback((next: GameHookState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const applyMove = useCallback(
    (direction: Direction) => {
      const prevState = stateRef.current;
      if (prevState.gameOver) return;
      const result = processMove(prevState.board, direction, prevState.score);
      if (!result.moved) return;

      history.push({
        state: prevState,
        tiles: tilesRef.current,
      });

      const byPos = new Map<string, TileView>();
      for (const t of tilesRef.current) {
        byPos.set(`${t.r},${t.c}`, t);
      }

      const trace = traceMovements(prevState.board, direction);
      // 移動(またはマージ先)になったセルの集合。スポーンはこの集合外に出現する
      const targets = new Set<string>();
      for (const m of trace) {
        targets.add(`${m.toR},${m.toC}`);
      }

      const nextTiles: TileView[] = [];
      for (const m of trace) {
        if (m.absorbed) continue;
        const t = byPos.get(`${m.fromR},${m.fromC}`);
        if (!t) continue;
        const newValue = result.board[m.toR][m.toC];
        nextTiles.push({
          id: t.id,
          value: newValue,
          r: m.toR,
          c: m.toC,
          isNew: false,
          merged: newValue !== t.value,
        });
      }
      const n = prevState.size;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (result.board[r][c] !== 0 && !targets.has(`${r},${c}`)) {
            nextTiles.push({
              id: nextTileId++,
              value: result.board[r][c],
              r,
              c,
              isNew: true,
              merged: false,
            });
          }
        }
      }

      const nextState: GameHookState = {
        board: result.board,
        size: prevState.size,
        score: result.score,
        gameOver: result.gameOver,
        won: prevState.won || result.won,
        keepPlaying: prevState.keepPlaying,
        moveCount: prevState.moveCount + 1,
      };
      applyState(nextState);
      tilesRef.current = nextTiles;
      setTiles(nextTiles);
      if (result.scoreGain > 0) {
        scorePopupKeyRef.current += 1;
        setScorePopup({ amount: result.scoreGain, key: scorePopupKeyRef.current });
        playMerge(result.scoreGain);
      }
      if (result.won && !prevState.won) {
        playWin();
      }
      if (result.gameOver) {
        playGameOver();
        recordGameEnd({
          size: prevState.size,
          score: result.score,
          won: nextState.won,
          maxTile: maxTileValue(result.board),
          moves: nextState.moveCount,
        });
      }
      clearHint();
    },
    [applyState, history, recordGameEnd, clearHint],
  );

  const move = applyMove;

  // オートプレイ
  const [autoDelay, setAutoDelay] = useState(200);
  const autoDelayRef = useRef(autoDelay);
  autoDelayRef.current = autoDelay;

  const getState = useCallback(() => stateRef.current, []);
  const getDelayMs = useCallback(() => autoDelayRef.current, []);
  const getDifficulty = useCallback(() => difficultyRef.current, []);

  const autoPlayer = useAutoPlayer({ getState, applyMove, getDelayMs, getDifficulty });
  const autoPlayRef = useRef(autoPlayer.autoPlay);
  autoPlayRef.current = autoPlayer.autoPlay;
  const toggleAutoPlay = useCallback(() => {
    autoPlayer.toggleAutoPlay();
    clearHint();
  }, [autoPlayer, clearHint]);

  const reset = useCallback(
    (nextSize?: number) => {
      const size = nextSize ?? stateRef.current.size;
      const { board, score } = initializeGame(size);
      applyState({
        board,
        size,
        score,
        gameOver: false,
        won: false,
        keepPlaying: false,
        moveCount: 0,
      });
      const freshTiles = buildTiles(board, true);
      tilesRef.current = freshTiles;
      setTiles(freshTiles);
      history.clear();
      setScorePopup(null);
      clearHint();
      autoPlayer.deactivate();
    },
    [applyState, history, autoPlayer, clearHint],
  );

  /** 盤面サイズを変更して新規ゲームを開始する */
  const changeBoardSize = useCallback(
    (size: number) => {
      reset(size);
    },
    [reset],
  );

  const undo = useCallback(() => {
    const entry = history.pop();
    if (!entry) return;
    applyState(entry.state);
    const restored = entry.tiles.map((t) => ({ ...t, isNew: false, merged: false }));
    tilesRef.current = restored;
    setTiles(restored);
    setScorePopup(null);
    clearHint();
  }, [applyState, history, clearHint]);

  const continuePlaying = useCallback(() => {
    applyState({ ...stateRef.current, keepPlaying: true });
  }, [applyState]);

  const clearScorePopup = useCallback(() => setScorePopup(null), []);

  // 効果音ミュート
  const [muted, setMutedState] = useState(isMuted());
  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, []);

  // 入力操作(キーボード / スワイプ)。Undo は Auto 中はボタン同様に無効、h キーでヒント
  const isUndoEnabled = useCallback(() => !autoPlayRef.current, []);
  const handleRequestHint = useCallback(() => {
    if (!autoPlayRef.current) requestHint();
  }, [requestHint]);
  useKeyboardControls(applyMove, undo, { isUndoEnabled, requestHint: handleRequestHint });
  const swipe = useSwipe(applyMove);

  return {
    ...state,
    tiles,
    bestScore,
    scorePopup,
    canUndo: history.canUndo,
    hint,
    hintPending,
    autoPlay: autoPlayer.autoPlay,
    autoDelay,
    difficulty,
    setDifficulty,
    move,
    reset,
    changeBoardSize,
    undo,
    requestHint,
    toggleAutoPlay,
    continuePlaying,
    clearScorePopup,
    setAutoDelay,
    muted,
    toggleMuted,
    stats,
    handleTouchStart: swipe.handleTouchStart,
    handleTouchEnd: swipe.handleTouchEnd,
  };
}
