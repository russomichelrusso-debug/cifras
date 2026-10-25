import { describe, expect, it } from 'vitest';
import { beatsBetween, clampBpm, tapTempo } from '../js/audio/metronome.js';
import { OPEN_STRING_HZ, pluck, shapeFrequencies, strum } from '../js/audio/synth.js';

// Gerador previsível para os testes
function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const rms = (a, from, to) => Math.sqrt(a.slice(from, to).reduce((sum, x) => sum + x * x, 0) / (to - from));

describe('frequências da forma', () => {
  it('cordas soltas e abafadas', () => {
    expect(shapeFrequencies(['x', 0, 2, 2, 2, 0]).map((f) => Math.round(f))).toEqual([110, 165, 220, 277, 330]);
  });

  it('capo sobe meio tom por casa', () => {
    const [low] = shapeFrequencies([0, 'x', 'x', 'x', 'x', 'x'], 2);
    expect(low).toBeCloseTo(OPEN_STRING_HZ[0] * 2 ** (2 / 12), 5);
  });
});

describe('Karplus-Strong', () => {
  const sr = 44100;
  const note = pluck(220, sr, 1, { rng: seeded() });

  it('tem a duração pedida', () => {
    expect(note.length).toBe(sr);
  });

  it('decai com o tempo', () => {
    expect(rms(note, sr * 0.8, sr)).toBeLessThan(rms(note, 0, sr * 0.2) * 0.5);
  });

  it('repete no período da nota (afinada)', () => {
    const period = Math.round(sr / 220);
    const corr = (lag) => note.slice(2000, 6000).reduce((s, x, i) => s + x * note[2000 + i + lag], 0);
    expect(corr(period)).toBeGreaterThan(corr(Math.round(period * 1.5)));
    expect(corr(period)).toBeGreaterThan(0);
  });

  it('rasgueado: soma as cordas sem estourar', () => {
    const mix = strum([110, 165, 220, 277, 330], sr, { rng: seeded(7) });
    expect(Math.max(...mix.map(Math.abs))).toBeLessThanOrEqual(1);
    expect(mix[mix.length - 1]).toBe(0);
  });
});

describe('metrônomo', () => {
  it('agenda as batidas do intervalo, com a primeira do compasso marcada', () => {
    const beats = beatsBetween({ start: 0, bpm: 120, beatsPerBar: 4 }, 0, 2.6);
    expect(beats.map((b) => b.time)).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
    expect(beats.map((b) => b.beat)).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it('janelas seguidas não repetem nem perdem batidas', () => {
    const state = { start: 1, bpm: 90, beatsPerBar: 3 };
    const a = beatsBetween(state, 0, 2.2);
    const b = beatsBetween(state, 2.2, 4);
    const all = [...a, ...b].map((x) => x.time.toFixed(4));
    expect(new Set(all).size).toBe(all.length);
    expect(all).toEqual(beatsBetween(state, 0, 4).map((x) => x.time.toFixed(4)));
  });

  it('limita o andamento', () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(999)).toBe(260);
    expect(clampBpm('72')).toBe(72);
  });

  it('tap tempo: média dos últimos toques, ignora pausa longa', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 5000, 5500, 6000])).toBe(120);
    expect(tapTempo([0])).toBeNull();
  });
});
