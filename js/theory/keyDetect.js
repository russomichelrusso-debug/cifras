// Inferência do tom a partir da sequência de acordes.
// A pontuação é heurística: o resultado vai para a prévia de importação para ser confirmado.

import { mod12, pcOf } from './notes.js';
import { formatKey, transposeKey } from './transpose.js';

// [distância da tônica, qualidade da tríade, peso]
const FIELDS = {
  major: [
    [0, 'maj', 1], [2, 'min', 1], [4, 'min', 1], [5, 'maj', 1], [7, 'maj', 1], [9, 'min', 1], [11, 'dim', 1],
    // bVII emprestado (mixolídio): muito comum em rock e louvor
    [10, 'maj', 0.75],
  ],
  minor: [
    // natural
    [0, 'min', 1], [2, 'dim', 1], [3, 'maj', 1], [5, 'min', 1], [7, 'min', 0.5], [8, 'maj', 1], [10, 'maj', 1],
    // harmônica e melódica
    [7, 'maj', 1], [11, 'dim', 0.5], [5, 'maj', 0.5], [2, 'min', 0.5],
  ],
};

const WEIGHTS = { diatonic: 1, tonicChord: 1, lineStart: 1, lineEnd: 0.5, first: 2, last: 2, cadence7: 1.5, cadence: 0.5 };

function quality(chord) {
  if (chord.triad === 'sus2' || chord.triad === 'sus4' || chord.triad === '5') return 'any';
  return chord.triad;
}

function fieldWeight(chord, tonicPc, mode) {
  const offset = mod12(pcOf(chord.root) - tonicPc);
  const q = quality(chord);
  let best = 0;
  for (const [o, fq, w] of FIELDS[mode]) {
    if (o === offset && (q === fq || q === 'any')) best = Math.max(best, w);
  }
  return best;
}

const isTonic = (chord, tonicPc, mode) =>
  pcOf(chord.root) === tonicPc && (quality(chord) === 'any' || quality(chord) === (mode === 'major' ? 'maj' : 'min'));

/**
 * Retorna os 24 tons ordenados por pontuação: [{ key, name, score }].
 * `entries`: [{ chord, lineStart, lineEnd }] (ver songChords) ou só os acordes.
 * Começo de linha conta mais: em rock e pop o tom aparece ali, e o V -> I sozinho engana
 * (I -> IV em mixolídio parece cadência no IV).
 */
export function rankKeys(entries) {
  const list = entries.map((e) => (e.chord ? e : { chord: e, lineStart: false, lineEnd: false }));
  if (!list.length) return [];
  const results = [];
  for (const mode of ['major', 'minor']) {
    for (let pc = 0; pc < 12; pc++) {
      let score = 0;
      list.forEach(({ chord, lineStart, lineEnd }, i) => {
        score += WEIGHTS.diatonic * fieldWeight(chord, pc, mode);
        if (!isTonic(chord, pc, mode)) return;
        score += WEIGHTS.tonicChord;
        if (lineStart) score += WEIGHTS.lineStart;
        if (lineEnd) score += WEIGHTS.lineEnd;
        const prev = list[i - 1]?.chord;
        if (prev && mod12(pcOf(prev.root) - pc) === 7 && prev.triad === 'maj') {
          score += prev.seventh === '7' ? WEIGHTS.cadence7 : WEIGHTS.cadence;
        }
      });
      if (isTonic(list[0].chord, pc, mode)) score += WEIGHTS.first;
      if (isTonic(list[list.length - 1].chord, pc, mode)) score += WEIGHTS.last;
      const key = transposeKey({ tonic: 'C', mode }, pc);
      results.push({ key, name: formatKey(key), score: score / list.length });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

export const detectKey = (chords) => rankKeys(chords)[0]?.key ?? null;
