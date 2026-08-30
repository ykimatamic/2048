import { formatNumber } from "../game/format.ts";
import type { StatsMap } from "../hooks/useStats.ts";
import { Modal } from "./Modal.tsx";

interface HelpModalProps {
  stats: StatsMap;
  onClose: () => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <li>
      <span className="keycap">{label}</span>
      {value}
    </li>
  );
}

export function HelpModal({ stats, onClose }: HelpModalProps) {
  const sizes = Object.keys(stats)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Modal title="Help &amp; Stats" onClose={onClose}>
      <h2>How to Play</h2>
      <ul>
        <StatRow label="←↑↓→ / WASD" value="Move tiles" />
        <StatRow label="Swipe" value="Move tiles (touch)" />
        <StatRow label="Z / Backspace" value="Undo (up to 32 moves)" />
        <StatRow label="H" value="Hint" />
        <StatRow label="?" value="Open this dialog" />
        <StatRow label="Esc" value="Close dialogs" />
      </ul>
      <h2>Features</h2>
      <ul>
        <li>
          <strong>Auto:</strong> the AI plays for you. Speed slider adjusts the pace.
        </li>
        <li>
          <strong>Easy / Normal / Hard:</strong> AI search depth.
        </li>
        <li>
          <strong>3x3 / 4x4 / 5x5:</strong> board size (starts a new game).
        </li>
      </ul>
      <h2>Statistics</h2>
      <p className="stats-empty">
        Finished games only (games that reach Game Over are counted).
      </p>
      {sizes.length === 0 ? (
        <p className="stats-empty">No finished games yet.</p>
      ) : (
        <table className="stats-table">
          <thead>
            <tr>
              <th scope="col">Board</th>
              <th scope="col">Games</th>
              <th scope="col">Wins</th>
              <th scope="col">Best</th>
              <th scope="col">Top tile</th>
              <th scope="col">Avg moves</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((size) => {
              const s = stats[size];
              return (
                <tr key={size}>
                  <td>{`${size}x${size}`}</td>
                  <td>{s.games}</td>
                  <td>{s.wins}</td>
                  <td>{formatNumber(s.bestScore)}</td>
                  <td>{formatNumber(s.bestTile)}</td>
                  <td>{s.games > 0 ? Math.round(s.totalMoves / s.games) : 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
