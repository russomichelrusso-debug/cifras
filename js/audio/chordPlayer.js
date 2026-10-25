// Toca a forma do acorde como um rasgueado de violão (síntese, sem arquivos de áudio).

import { audioContext } from './context.js';
import { shapeFrequencies, strum } from './synth.js';

export function playShape(frets, { capo = 0 } = {}) {
  const ctx = audioContext();
  const freqs = shapeFrequencies(frets, capo);
  if (!freqs.length) return;
  const data = strum(freqs, ctx.sampleRate);
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buffer.copyToChannel(data, 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}
