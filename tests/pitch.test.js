import { describe, expect, it } from 'vitest';
import { createSmoother, detectPitch, nearestString, noteOf } from '../js/audio/pitch.js';
import { OPEN_STRING_HZ, pluck } from '../js/audio/synth.js';

const SR = 48000;
const cents = (a, b) => 1200 * Math.log2(a / b);

function sine(hz, { n = 4096, amp = 0.5, harmonics = [1] } = {}) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) harmonics.forEach((g, k) => (out[i] += amp * g * Math.sin((2 * Math.PI * hz * (k + 1) * i) / SR)));
  return out;
}

// Gerador determinístico para o ruído inicial da corda sintetizada.
function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('detectPitch', () => {
  it.each(OPEN_STRING_HZ.map((hz, i) => [6 - i, hz]))('corda %i solta (senoide) a menos de 1 cent', (_, hz) => {
    const r = detectPitch(sine(hz), SR);
    expect(Math.abs(cents(r.hz, hz))).toBeLessThan(1);
  });

  it('Lá 440 e notas agudas', () => {
    expect(Math.abs(cents(detectPitch(sine(440), SR).hz, 440))).toBeLessThan(1);
    expect(Math.abs(cents(detectPitch(sine(659.26), SR).hz, 659.26))).toBeLessThan(1);
  });

  it('não confunde com a oitava quando o 2º harmônico é mais forte que a fundamental', () => {
    const r = detectPitch(sine(82.41, { harmonics: [0.4, 1, 0.6, 0.3] }), SR);
    expect(Math.abs(cents(r.hz, 82.41))).toBeLessThan(2);
  });

  it('corda sintetizada (Karplus-Strong) cai na corda certa', () => {
    OPEN_STRING_HZ.forEach((hz) => {
      const sound = pluck(hz, SR, 0.3, { rng: seeded(7) }).subarray(2000, 6096);
      // A corda sintetizada tem período inteiro de amostras e a média com a amostra seguinte
      // encurta meia amostra: a altura real é SR / (período − 0,5).
      const period = Math.max(2, Math.round(SR / hz));
      expect(Math.abs(cents(detectPitch(sound, SR).hz, SR / (period - 0.5)))).toBeLessThan(1);
    });
  });

  it('silêncio e ruído não dão nota', () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBeNull();
    const rng = seeded(3);
    expect(detectPitch(Float32Array.from({ length: 4096 }, () => rng() * 2 - 1), SR)).toBeNull();
  });
});

describe('noteOf', () => {
  it('nome, oitava e cents', () => {
    expect(noteOf(440)).toEqual({ midi: 69, name: 'A', octave: 4, cents: 0 });
    expect(noteOf(82.41)).toMatchObject({ name: 'E', octave: 2, cents: 0 });
    expect(noteOf(441).cents).toBe(4);
    expect(noteOf(435).cents).toBe(-20);
  });

  it('referência Lá 442', () => {
    expect(noteOf(442, 442)).toMatchObject({ name: 'A', cents: 0 });
    expect(noteOf(440, 442).cents).toBe(-8);
  });
});

describe('nearestString', () => {
  it('escolhe a corda mais próxima e o desvio', () => {
    expect(nearestString(82.41)).toEqual({ index: 0, cents: 0 });
    expect(nearestString(108)).toMatchObject({ index: 1 });
    expect(nearestString(108).cents).toBe(-32);
    expect(nearestString(330)).toMatchObject({ index: 5, cents: 2 });
  });

  it('acompanha a referência', () => {
    expect(nearestString(110 * (442 / 440), 442)).toEqual({ index: 1, cents: 0 });
  });
});

describe('createSmoother', () => {
  it('ignora uma leitura fora da curva', () => {
    const s = createSmoother(5);
    [110, 110.2, 220, 109.9].forEach((v) => s.push(v));
    expect(s.push(110.1)).toBeCloseTo(110.1);
  });
});
