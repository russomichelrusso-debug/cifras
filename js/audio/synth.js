// Síntese de corda (Karplus-Strong) e frequências das formas. Funções puras, sem Web Audio.

// Afinação padrão, da 6ª corda (Mi grave) à 1ª: E2 A2 D3 G3 B3 E4.
export const OPEN_STRING_HZ = [82.4069, 110, 146.8324, 195.9977, 246.9417, 329.6276];

/** Frequências que a forma toca (cordas abafadas ficam de fora), da mais grave para a mais aguda. */
export function shapeFrequencies(frets, capo = 0) {
  return frets.flatMap((f, s) => (typeof f === 'number' ? [OPEN_STRING_HZ[s] * 2 ** ((f + capo) / 12)] : []));
}

/**
 * Corda dedilhada: ruído numa linha de atraso do tamanho do período, filtrado pela média
 * de vizinhos a cada volta. O resultado soa como corda e decai sozinho.
 */
export function pluck(freq, sampleRate, seconds, { decay = 0.996, rng = Math.random } = {}) {
  const period = Math.max(2, Math.round(sampleRate / freq));
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = rng() * 2 - 1;
  // Ataque mais macio (som de dedo, não de palheta).
  for (let i = 1; i < period; i++) line[i] = 0.5 * (line[i] + line[i - 1]);
  const out = new Float32Array(Math.floor(sampleRate * seconds));
  let idx = 0;
  for (let i = 0; i < out.length; i++) {
    const current = line[idx];
    const next = line[(idx + 1) % period];
    out[i] = current;
    line[idx] = decay * 0.5 * (current + next);
    idx = (idx + 1) % period;
  }
  return out;
}

/**
 * Rasgueado: soma as cordas com um pequeno atraso entre elas (da grave para a aguda),
 * com fade-out no fim. Retorna um Float32Array mono pronto para um AudioBuffer.
 */
export function strum(freqs, sampleRate, { seconds = 2.5, gap = 0.03, gain = 0.28, rng = Math.random } = {}) {
  const total = Math.floor(sampleRate * (seconds + gap * freqs.length));
  const mix = new Float32Array(total);
  freqs.forEach((f, i) => {
    const note = pluck(f, sampleRate, seconds, { rng });
    const offset = Math.floor(i * gap * sampleRate);
    for (let j = 0; j < note.length && offset + j < total; j++) mix[offset + j] += note[j] * gain;
  });
  const fade = Math.floor(sampleRate * 0.3);
  for (let j = 0; j < fade; j++) mix[total - 1 - j] *= j / fade;
  for (let j = 0; j < total; j++) mix[j] = Math.max(-1, Math.min(1, mix[j]));
  return mix;
}
