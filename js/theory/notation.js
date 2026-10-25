// Exibição de acordes: transposição + capo + notação + simplificação.

import { formatChord, simplifyChord } from './chords.js';
import { intervalBetween, transposeChord, transposeKey } from './transpose.js';

/**
 * Como a música deve ser exibida.
 * originalKey e currentKey são tons que soam. Os acordes escritos no texto estão em
 * originalKey - sourceCapo (a cifra pode vir escrita para capo, como "CAPO 1").
 * - sounding: tom real (o que soa), usado na análise
 * - shapes: tom das formas tocadas (tom real - capo escolhido)
 * - shift: semitons dos acordes escritos até as formas exibidas
 */
export function viewKeys({ originalKey, currentKey, capo = 0, sourceCapo = 0 }) {
  return {
    sounding: currentKey,
    shapes: transposeKey(currentKey, -capo),
    shift: intervalBetween(originalKey, currentKey) - capo + sourceCapo,
  };
}

/** Tom dos acordes escritos no texto. */
export const writtenKey = (song) => transposeKey(song.originalKey, -(song.sourceCapo ?? 0));

/** Texto do acorde para exibir. `chord` null = N.C. */
export function displayChord(chord, { shift = 0, key, notation = 'br', simplify = false } = {}) {
  if (!chord) return 'N.C.';
  // Com o tom, regrafa mesmo sem transpor (A# vira Bb em F).
  let c = key ? transposeChord(chord, shift, key) : chord;
  if (simplify) c = simplifyChord(c);
  return formatChord(c, { notation });
}
