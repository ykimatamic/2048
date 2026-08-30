import { useEffect, useRef, useState } from "react";
import { useGame } from "../hooks/useGame.ts";
import type { MouseEvent as ReactMouseEvent } from "react";
import { formatNumber } from "../game/format.ts";
import { Board } from "./Board.tsx";
import { Score } from "./Score.tsx";
import { HelpModal } from "./HelpModal.tsx";

/** クリック後にフォーカスを外し、Space/Enter の誤発火を防ぐ */
function onClickBlur(handler: () => void) {
  return (e: ReactMouseEvent<HTMLButtonElement>) => {
    handler();
    e.currentTarget.blur();
  };
}

type Theme = "light" | "dark";

const THEME_KEY = "game2048:theme";

function loadInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage 使えない環境では OS 設定へフォールバック
  }
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
    ? "dark"
    : "light";
}

/** ヒント矢印(右向きが基準) */
const HINT_GLYPH = "\u27A4";

export function Game() {
  const [theme, setTheme] = useState<Theme>(loadInitialTheme);
  // ユーザーが明示的にトグルした場合のみ保存(OS 設定変更のライブ追従を優先するため)
  const themeManualRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", theme === "dark" ? "#2b2825" : "#faf8ef");
    if (themeManualRef.current) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // 保存できなくてもテーマ適用は継続
      }
    }
  }, [theme]);

  // OS のテーマ設定変更にライブ追従(手動指定時を除く)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!themeManualRef.current) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ヘルプ & 統計モーダル(? で開閉、Esc で閉じる)
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (e.key === "Escape") {
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 結果シェア(クリップボード)
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const {
    board,
    tiles,
    score,
    bestScore,
    gameOver,
    won,
    keepPlaying,
    moveCount,
    scorePopup,
    canUndo,
    hint,
    hintPending,
    autoPlay,
    autoDelay,
    size,
    difficulty,
    setDifficulty,
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
    handleTouchStart,
    handleTouchEnd,
  } = useGame();

  useEffect(() => {
    document.title = score > 0 ? `2048 — ${formatNumber(score)} pts` : "2048";
  }, [score]);

  const shareResult = async () => {
    const text = `2048 — ${formatNumber(score)} pts · ${moveCount} moves`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // クリップボード不可環境では何もしない
    }
  };

  return (
    <div className="game">
      <div className="title-row">
        <h1 className="title">2048</h1>
        <button
          className="icon-button"
          onClick={onClickBlur(() => setShowHelp(true))}
          title="Help & Stats (?)"
          aria-label="Open help and statistics"
        >
          ?
        </button>
        <button
          className="icon-button"
          onClick={onClickBlur(toggleMuted)}
          title={muted ? "Unmute" : "Mute"}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? "Sound Off" : "Sound On"}
        </button>
        <button
          className="icon-button"
          onClick={onClickBlur(() => {
            themeManualRef.current = true;
            setTheme((t) => (t === "dark" ? "light" : "dark"));
          })}
          title="Toggle dark mode"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
      <div className="header">
        <div className="score-area">
          <Score score={score} best={bestScore} />
          {scorePopup && (
            <div
              key={scorePopup.key}
              className="score-popup"
              onAnimationEnd={clearScorePopup}
            >
              +{formatNumber(scorePopup.amount)}
            </div>
          )}
        </div>
        <div className="buttons">
          <div className="buttons-row">
            <button className="new-game-button" onClick={onClickBlur(reset)}>
              New Game
            </button>
            <button
              className="undo-button"
              onClick={onClickBlur(undo)}
              disabled={!canUndo || autoPlay}
            >
              Undo
            </button>
          </div>
          <div className="buttons-row">
            <button
              className="hint-button"
              onClick={onClickBlur(requestHint)}
              disabled={autoPlay || hintPending}
            >
              {hintPending ? "…" : "Hint"}
            </button>
            <button
              className={`auto-button ${autoPlay ? "auto-active" : ""}`}
              onClick={onClickBlur(toggleAutoPlay)}
            >
              {autoPlay ? "Stop" : "Auto"}
            </button>
          </div>
          <label className="speed-row">
            <span className="speed-label">Speed</span>
            <input
              type="range"
              min={40}
              max={400}
              step={20}
              value={440 - autoDelay}
              onChange={(e) => setAutoDelay(440 - Number(e.target.value))}
              disabled={!autoPlay}
              title={`${autoDelay}ms per move`}
            />
          </label>
          <div className="buttons-row">
            {(["easy", "normal", "hard"] as const).map((d) => (
              <button
                key={d}
                className={`difficulty-button ${difficulty === d ? "difficulty-active" : ""}`}
                onClick={onClickBlur(() => setDifficulty(d))}
              >
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <div className="buttons-row">
            {([3, 4, 5] as const).map((s) => (
              <button
                key={s}
                className={`difficulty-button ${size === s ? "difficulty-active" : ""}`}
                onClick={onClickBlur(() => changeBoardSize(s))}
                title={`${s}x${s} board`}
              >
                {s}x{s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className="board-wrapper"
        data-hint={hint && !autoPlay ? hint : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Board board={board} tiles={tiles} />
        {hint && !autoPlay && (
          <div className="hint-arrow" data-dir={hint} aria-label={`Hint: ${hint}`}>
            {HINT_GLYPH}
          </div>
        )}
        {autoPlay && (
          <div className="auto-indicator">AUTO</div>
        )}
        {gameOver && (
          <div className="overlay" role="alert">
            <div className="overlay-text">Game Over!</div>
            <div className="overlay-score">
              Score: <strong>{formatNumber(score)}</strong>
            </div>
            <div className="overlay-actions">
              <button className="overlay-button primary" onClick={onClickBlur(reset)}>
                Retry
              </button>
              <button className="overlay-button" onClick={onClickBlur(undo)} disabled={!canUndo}>
                Undo
              </button>
              <button className="overlay-button" onClick={onClickBlur(shareResult)}>
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>
        )}
        {won && !keepPlaying && !gameOver && (
          <div className="overlay won" role="alert">
            <div className="overlay-text">You Win!</div>
            <div className="overlay-actions">
              <button className="overlay-button primary" onClick={onClickBlur(continuePlaying)}>
                Keep going
              </button>
              <button className="overlay-button" onClick={onClickBlur(reset)}>
                New Game
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="instructions">
        {autoPlay
          ? "AI is playing..."
          : `${moveCount} moves · Arrows / WASD · Z = Undo · H = Hint`}
      </p>
      {showHelp && <HelpModal stats={stats} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
