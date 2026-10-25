// Afinador: frequência de um trecho de áudio e a nota/corda mais próxima. Funções puras, sem Web Audio.

import { OPEN_STRING_HZ } from './synth.js';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Volume médio (RMS) do trecho. */
export function rms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

/**
 * Frequência fundamental pelo método YIN (de Cheveigné e Kawahara): diferença do sinal com ele mesmo
 * deslocado, normalizada pela média acumulada; o primeiro vale abaixo do limiar é o período.
 * Resiste aos harmônicos fortes do violão (não confunde a corda com a oitava de cima).
 * Retorna { hz, clarity } (clarity de 0 a 1) ou null em silêncio ou som sem altura definida.
 */
export function detectPitch(samples, sampleRate, { minHz = 60, maxHz = 1100, threshold = 0.15, minRms = 0.01 } = {}) {
  if (rms(samples) < minRms) return null;
  const maxTau = Math.min(Math.floor(sampleRate / minHz), Math.floor(samples.length / 2));
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const window = samples.length - maxTau;
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const diff = samples[i] - samples[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  // Diferença normalizada pela média acumulada (d'[0] = 1).
  let running = 0;
  d[0] = 1;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    d[tau] = running ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= maxTau && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  // Interpolação parabólica em volta do vale: precisão abaixo de uma amostra.
  let exact = tau;
  if (tau > 1 && tau < maxTau) {
    const [a, b, c] = [d[tau - 1], d[tau], d[tau + 1]];
    const denom = a - 2 * b + c;
    if (denom) exact = tau + (a - c) / (2 * denom);
  }
  return { hz: sampleRate / exact, clarity: 1 - d[tau] };
}

/** Nota mais próxima de `hz` e o desvio em cents (-50 a +50). Ex.: 441 Hz -> A4, +4 cents. */
export function noteOf(hz, a4 = 440) {
  const exact = 69 + 12 * Math.log2(hz / a4);
  const midi = Math.round(exact);
  return { midi, name: SHARP_NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: Math.round((exact - midi) * 100) };
}

/**
 * Corda solta (afinação padrão) mais próxima de `hz`: { index, cents }, index 0 = 6ª corda (Mi grave).
 * `a4` desloca as cordas junto com a referência (Lá 442 sobe tudo).
 */
export function nearestString(hz, a4 = 440) {
  let best = null;
  OPEN_STRING_HZ.forEach((open, index) => {
    const cents = 1200 * Math.log2(hz / (open * (a4 / 440)));
    if (!best || Math.abs(cents) < Math.abs(best.cents)) best = { index, cents: Math.round(cents) };
  });
  return best;
}

/** Mediana das últimas `size` leituras: o ponteiro não pula com uma leitura errada. */
export function createSmoother(size = 5) {
  const values = [];
  return {
    push(v) {
      values.push(v);
      if (values.length > size) values.shift();
      const sorted = [...values].sort((x, y) => x - y);
      return sorted[Math.floor(sorted.length / 2)];
    },
    reset: () => (values.length = 0),
  };
}
