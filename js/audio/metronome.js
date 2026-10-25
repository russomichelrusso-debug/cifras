// Metrônomo com agendamento adiantado (lookahead): um timer acorda a cada 25 ms e agenda no
// relógio do áudio as batidas dos próximos 120 ms. O timer pode atrasar; o som não.

import { audioContext } from './context.js';

export const MIN_BPM = 30;
export const MAX_BPM = 260;
export const clampBpm = (n) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(Number(n) || 0)));

/** Batidas a agendar no intervalo [from, until): [{ time, beat }] (beat 0 = primeira do compasso). Pura. */
export function beatsBetween({ start, bpm, beatsPerBar }, from, until) {
  const interval = 60 / bpm;
  const out = [];
  let n = Math.max(0, Math.ceil((from - start) / interval - 1e-9));
  for (let t = start + n * interval; t < until; n++, t = start + n * interval) out.push({ time: t, beat: n % beatsPerBar });
  return out;
}

/** Tempo médio entre toques ("tap tempo"). Usa os últimos 4 intervalos; ignora pausas longas. */
export function tapTempo(times) {
  const recent = times.slice(-5);
  const gaps = recent.slice(1).map((t, i) => t - recent[i]).filter((g) => g > 0 && g < 2000);
  if (!gaps.length) return null;
  return clampBpm(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
}

export function createMetronome({ onBeat } = {}) {
  let timer = null;
  let state = null;
  let scheduledUntil = 0;
  const LOOKAHEAD = 0.12;

  function click(ctx, time, accent) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.35, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  function tick() {
    const ctx = audioContext();
    const until = ctx.currentTime + LOOKAHEAD;
    for (const { time, beat } of beatsBetween(state, scheduledUntil, until)) {
      click(ctx, time, beat === 0);
      const delay = Math.max(0, (time - ctx.currentTime) * 1000);
      setTimeout(() => onBeat?.(beat), delay);
    }
    scheduledUntil = until;
  }

  return {
    start(bpm, beatsPerBar = 4) {
      const ctx = audioContext();
      state = { start: ctx.currentTime + 0.05, bpm: clampBpm(bpm), beatsPerBar };
      scheduledUntil = ctx.currentTime;
      clearInterval(timer);
      timer = setInterval(tick, 25);
      tick();
    },
    /** Muda o andamento sem perder o compasso: recomeça a contagem a partir da próxima batida. */
    update(bpm, beatsPerBar) {
      if (!state) return;
      const next = beatsBetween(state, scheduledUntil, scheduledUntil + 60 / state.bpm + 1e-6)[0];
      state = { start: next ? next.time : scheduledUntil, bpm: clampBpm(bpm), beatsPerBar: beatsPerBar ?? state.beatsPerBar };
    },
    stop() {
      clearInterval(timer);
      timer = null;
      state = null;
    },
    get running() {
      return timer !== null;
    },
  };
}
