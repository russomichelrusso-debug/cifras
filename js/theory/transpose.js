// Transposição com grafia pela armadura do tom de destino.
// Tom: { tonic: "C", mode: "major" | "minor" }

import { LETTERS, letterIndex, mod12, parseNote, pcOf, simpleName, spellWithLetter } from './notes.js';

// Grafia padrão da tônica para cada índice cromático (F# maior e Eb menor, ver seção 8 da arquitetura).
const TONIC_NAMES = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

// Distância em semitons a partir da tônica -> passos de letra (grau - 1).
// 0 I, 1 bII, 2 II, 3 bIII, 4 III, 5 IV, 6 #IV, 7 V, 8 bVI, 9 VI, 10 bVII, 11 VII
const DEGREE_STEPS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

const AWKWARD = new Set(['E#', 'B#', 'Cb', 'Fb']);
const FLAT_MINOR = new Set(['D', 'G', 'C', 'F']);

export function keyPrefersFlats(key) {
  if (key.tonic.includes('b')) return true;
  return key.mode === 'major' ? key.tonic === 'F' : FLAT_MINOR.has(key.tonic);
}

/** "Em" -> { tonic: "E", mode: "minor" }; "C" -> maior. */
export function parseKey(str) {
  const m = /^([A-G](?:#|b)?)(m|min|menor)?$/.exec(String(str).trim());
  if (!m) return null;
  return { tonic: m[1], mode: m[2] ? 'minor' : 'major' };
}

export const formatKey = (key) => key.tonic + (key.mode === 'minor' ? 'm' : '');

export function transposeKey(key, semitones) {
  const pc = mod12(pcOf(key.tonic) + semitones);
  return { tonic: TONIC_NAMES[key.mode][pc], mode: key.mode };
}

/** Grafa uma nota pelo grau dentro do tom (em E, a nota 2 = D, não C##). */
export function spellInKey(pc, key) {
  const tonic = parseNote(key.tonic);
  const offset = mod12(pc - tonic.pc);
  const letter = LETTERS[(letterIndex(tonic.letter) + DEGREE_STEPS[offset]) % 7];
  const name = spellWithLetter(pc, letter);
  if (!name || name.length > 2 || AWKWARD.has(name)) return simpleName(pc, keyPrefersFlats(key));
  return name;
}

/** Transpõe um acorde (modelo de chords.js) em `semitones`, grafando pelo tom de destino. */
export function transposeChord(chord, semitones, targetKey) {
  const move = (name) => spellInKey(mod12(pcOf(name) + semitones), targetKey);
  return { ...chord, root: move(chord.root), bass: chord.bass ? move(chord.bass) : null };
}

/** Semitons de `from` até `to` (0 a 11). */
export const intervalBetween = (from, to) => mod12(pcOf(to.tonic) - pcOf(from.tonic));
