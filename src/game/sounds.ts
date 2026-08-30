/**
 * Web Audio による合成効果音(アセット不要)。
 * AudioContext は初回のユーザー操作内で遅延生成する。
 */

let ctx: AudioContext | null = null;

let muted = (() => {
  try {
    return localStorage.getItem("game2048:muted") === "1";
  } catch {
    return false;
  }
})();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem("game2048:muted", value ? "1" : "0");
  } catch {
    // 保存できなくてもミュート状態はメモリで保持
  }
}

function ensureCtx(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AC = w.AudioContext ?? w.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, duration: number, delay = 0, gain = 0.08): void {
  const c = ensureCtx();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    // 音が出せない環境では無視
  }
}

/** マージ音。ゲインが大きいほど高めの音 */
export function playMerge(scoreGain: number): void {
  const exp = Math.max(2, Math.min(12, Math.round(Math.log2(Math.max(4, scoreGain)))));
  const base = 220 * Math.pow(2, exp / 12);
  blip(base * 2, 0.07, 0, 0.07);
  blip(base * 2.5, 0.09, 0.04, 0.05);
}

/** 2048 到達のファンファーレ */
export function playWin(): void {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, i * 0.12, 0.09));
}

/** ゲームオーバー音 */
export function playGameOver(): void {
  blip(220, 0.25, 0, 0.09);
  blip(165, 0.35, 0.18, 0.09);
}
