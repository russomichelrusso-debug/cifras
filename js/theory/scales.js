// Escalas em semitons a partir da tônica.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
};

/** Escala própria do tom (maior ou menor natural). */
export const ownScale = (key) => (key.mode === 'major' ? SCALES.major : SCALES.naturalMinor);

/** Escala do tom homônimo (C maior <-> C menor), fonte do empréstimo modal. */
export const parallelScale = (key) => (key.mode === 'major' ? SCALES.naturalMinor : SCALES.major);

/** Tríade formada sobre o grau `index` (0 a 6) da escala: "maj" | "min" | "dim" | "aug". */
export function triadOnDegree(scale, index) {
  const at = (k) => scale[(index + k) % 7] + (index + k >= 7 ? 12 : 0);
  const third = at(2) - scale[index];
  const fifth = at(4) - scale[index];
  if (third === 4) return fifth === 8 ? 'aug' : 'maj';
  return fifth === 6 ? 'dim' : 'min';
}
