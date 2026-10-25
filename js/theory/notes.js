// Notas: nomes, índices cromáticos (0 a 11) e grafia.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTAL_OFFSET = { '': 0, '#': 1, b: -1, '##': 2, bb: -2 };

export const LATIN = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const mod12 = (n) => ((n % 12) + 12) % 12;

/** "F#" -> { letter: "F", accidental: "#", pc: 6 }. Aceita "♯", "♭". Retorna null se inválido. */
export function parseNote(str) {
  const m = /^([A-G])(##|bb|#|b|♯|♭)?$/.exec(str);
  if (!m) return null;
  const accidental = (m[2] || '').replace('♯', '#').replace('♭', 'b');
  return { letter: m[1], accidental, pc: mod12(LETTER_PC[m[1]] + ACCIDENTAL_OFFSET[accidental]) };
}

export const pcOf = (name) => parseNote(name)?.pc ?? null;

/** Nome simples (sem dobrados) para um índice cromático. */
export function simpleName(pc, preferFlats = false) {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

/**
 * Grafa o índice `pc` usando a letra `letter`.
 * Retorna null se exigir acidente além de dobrado.
 */
export function spellWithLetter(pc, letter) {
  let diff = mod12(pc - LETTER_PC[letter]);
  if (diff > 6) diff -= 12;
  const acc = Object.entries(ACCIDENTAL_OFFSET).find(([, v]) => v === diff);
  return acc ? letter + acc[0] : null;
}

export const letterIndex = (letter) => LETTERS.indexOf(letter);

/** Nome latino: "F#" -> "Fá#", "Bb" -> "Sib". */
export function latinName(name) {
  const n = parseNote(name);
  return n ? LATIN[n.letter] + n.accidental : name;
}
