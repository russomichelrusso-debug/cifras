// Exibição de acordes: transposição + capo + notação + simplificação.

import { formatChord, simplifyChord } from './chords.js';
import { intervalBetween, transposeChord, transposeKey } from './transpose.js';

/**
 * Como a música deve ser exibida.
 * originalKey e currentKey são tons que soam. Os acordes escritos no texto estão em
 * originalKey - sourceCapo (a cifra pode vir escrita para capo, como "CAPO 1").
 * - shapes: tom das formas tocadas (tom real - capo escolhido)
 * - shift: semitons dos acordes escritos até as formas exibidas
 * - soundingShift: semitons dos acordes escritos até o que soa (usado na análise, no tom currentKey)
 */
export function viewKeys({ originalKey, currentKey, capo = 0, sourceCapo = 0 }) {
  const shift = intervalBetween(originalKey, currentKey) - capo + sourceCapo;
  return { shapes: transposeKey(currentKey, -capo), shift, soundingShift: shift + capo };
}

/** Tom dos acordes escritos no texto. */
export const writtenKey = (song) => transposeKey(song.originalKey, -(song.sourceCapo ?? 0));

/** Acorde como aparece na tela (transposto, simplificado). `chord` null = N.C. */
export function shownChord(chord, { shift = 0, key, simplify = false } = {}) {
  if (!chord) return null;
  // Com o tom, regrafa mesmo sem transpor (A# vira Bb em F).
  const c = key ? transposeChord(chord, shift, key) : chord;
  return simplify ? simplifyChord(c) : c;
}

/** Texto do acorde para exibir. */
export function displayChord(chord, { notation = 'br', ...opts } = {}) {
  const c = shownChord(chord, opts);
  return c ? formatChord(c, { notation }) : 'N.C.';
}
