// Busca de formas: formas abertas digitadas + pestanas geradas (formas de E e de A) para qualquer tônica.
//
// shape: { frets, fingers, barre?, baseFret, source: "open" | "barre" | "site" }
// lookupShapes(chord) -> { shapes, approx: string | null, bassNote: string | null }

import { formatBR, parseChord, simplifyChord } from '../theory/chords.js';
import { mod12, pcOf } from '../theory/notes.js';
import { OPEN_SHAPES, SLASH_SHAPES } from './shapes.js';

export const STANDARD_TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E

const signature = (c) => `${c.triad}|${c.seventh}|${c.tensions.join(',')}`;
const keyOf = (c) => `${mod12(pcOf(c.root))}|${signature(c)}`;

// Moldes móveis: deslocamento de casa por corda a partir da casa da fundamental.
const TEMPLATES = {
  E: {
    'maj|null|': [0, 2, 2, 1, 0, 0],
    'min|null|': [0, 2, 2, 0, 0, 0],
    'maj|7|': [0, 2, 0, 1, 0, 0],
    'min|7|': [0, 2, 0, 0, 0, 0],
    'maj|maj7|': [0, 'x', 1, 1, 0, 'x'],
    'sus4|null|': [0, 2, 2, 2, 0, 0],
    'sus4|7|': [0, 2, 0, 2, 0, 0],
    'dim|7|': [0, 'x', 0, 0, -1, 'x'],
    'dim|dim7|': [0, 'x', -1, 0, -1, 'x'],
    '5|null|': [0, 2, 2, 'x', 'x', 'x'],
    'maj|null|9': [0, 2, 4, 1, 0, 0],
    'min|null|9': [0, 2, 4, 0, 0, 0],
    'min|7|9': [0, 'x', 0, 0, 0, 2],
  },
  A: {
    'maj|null|': ['x', 0, 2, 2, 2, 0],
    'min|null|': ['x', 0, 2, 2, 1, 0],
    'maj|7|': ['x', 0, 2, 0, 2, 0],
    'min|7|': ['x', 0, 2, 0, 1, 0],
    'maj|maj7|': ['x', 0, 2, 1, 2, 0],
    'sus4|null|': ['x', 0, 2, 2, 3, 0],
    'sus2|null|': ['x', 0, 2, 2, 0, 0],
    'sus4|7|': ['x', 0, 2, 0, 3, 0],
    'dim|null|': ['x', 0, 1, 2, 1, 'x'],
    'dim|7|': ['x', 0, 1, 0, 1, 'x'],
    'dim|dim7|': ['x', 0, 1, -1, 1, 'x'],
    'aug|null|': ['x', 0, 3, 2, 2, 'x'],
    'maj|6|': ['x', 0, 2, 2, 2, 2],
    'min|6|': ['x', 0, 2, 2, 1, 2],
    'maj|7|9': ['x', 0, -1, 0, 0, 'x'],
    'min|7|9': ['x', 0, -2, 0, 0, 'x'],
    'maj|7|#9': ['x', 0, -1, 0, 1, 'x'],
    'maj|7|b9': ['x', 0, -1, 0, -1, 'x'],
    'maj|maj7|9': ['x', 0, -1, 1, 0, 'x'],
    '5|null|': ['x', 0, 2, 2, 'x', 'x'],
  },
};
const ROOT_STRING = { E: 0, A: 1 };

const fretted = (frets) => frets.map((f, s) => ({ f, s })).filter(({ f }) => typeof f === 'number' && f > 0);

/** Dedos e pestana de uma forma gerada. */
export function fingering(frets) {
  const notes = fretted(frets);
  const fingers = frets.map(() => null);
  if (!notes.length) return { fingers };
  const min = Math.min(...notes.map((n) => n.f));
  const atMin = notes.filter((n) => n.f === min);
  let barre = null;
  let rest = notes;
  if (atMin.length >= 2) {
    const first = atMin[0].s;
    const last = atMin[atMin.length - 1].s;
    // Pestana só se nenhuma corda no meio estiver abaixo dela (solta ou abafada no meio quebra a pestana).
    if (frets.slice(first, last + 1).every((f) => typeof f === 'number' && f >= min)) {
      barre = { fret: min, from: 6 - first, to: 6 - last };
      atMin.forEach((n) => (fingers[n.s] = 1));
      rest = notes.filter((n) => n.f !== min);
    }
  }
  const sorted = [...rest].sort((a, b) => a.f - b.f || a.s - b.s);
  if (barre) {
    // Com pestana, o dedo segue a distância da casa: +1 -> 2, +2 -> 3 e 4.
    // Se não houver dedos para todas as notas da casa, um dedo só (minipestana).
    for (const fret of new Set(sorted.map((n) => n.f))) {
      const group = sorted.filter((n) => n.f === fret);
      const first = Math.min(4, 1 + fret - min);
      group.forEach((n, i) => (fingers[n.s] = first + group.length - 1 > 4 ? first : first + i));
    }
    return { fingers, barre };
  }
  sorted.forEach((n, i) => (fingers[n.s] = Math.min(4, 1 + i)));
  return { fingers };
}

/** Casa inicial do desenho: 1 se tudo cabe nas 4 primeiras casas. */
export function baseFretOf(frets) {
  const notes = fretted(frets).map((n) => n.f);
  if (!notes.length || Math.max(...notes) <= 4) return 1;
  return Math.min(...notes);
}

function generate(chord) {
  const out = [];
  const sig = signature(chord);
  const rootPc = pcOf(chord.root);
  for (const [shapeName, templates] of Object.entries(TEMPLATES)) {
    const template = templates[sig];
    if (!template) continue;
    const stringIndex = ROOT_STRING[shapeName];
    const minOffset = Math.min(...template.filter((t) => typeof t === 'number'));
    let r = mod12(rootPc - STANDARD_TUNING[stringIndex]);
    // Casa negativa não existe; casa 0 vira corda solta, que toca a mesma nota (Bb7(9) = x1011x).
    if (r + minOffset < 0) r += 12;
    if (r > 12) continue;
    const frets = template.map((t) => (t === 'x' ? 'x' : r + t));
    out.push({ frets, ...fingering(frets), source: 'barre', shape: shapeName });
  }
  return out;
}

function withBase(shape, source) {
  return { ...shape, baseFret: shape.baseFret ?? baseFretOf(shape.frets), source: shape.source ?? source };
}

// Índice das formas digitadas, pela tônica e pela qualidade (C# e Db caem no mesmo lugar).
const OPEN_INDEX = new Map();
for (const [name, shapes] of Object.entries(OPEN_SHAPES)) OPEN_INDEX.set(keyOf(parseChord(name)), shapes);
const SLASH_INDEX = new Map();
for (const [name, shapes] of Object.entries(SLASH_SHAPES)) {
  const c = parseChord(name);
  SLASH_INDEX.set(`${keyOf(c)}/${mod12(pcOf(c.bass))}`, shapes);
}

function exactShapes(chord) {
  const open = (OPEN_INDEX.get(keyOf(chord)) ?? []).map((s) => withBase(s, 'open'));
  const barre = generate(chord).map((s) => withBase(s, 'barre'));
  const seen = new Set();
  return [...open, ...barre].filter((s) => {
    const k = s.frets.join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Formas para o acorde.
 * - siteDiagram: diagrama do site com o mesmo nome (reserva quando a biblioteca não tem o acorde).
 * Retorna { shapes, approx, bassNote }:
 * - approx: texto quando a forma é de um acorde mais simples ("Forma de C7, sem a 9ª")
 * - bassNote: baixo pedido que a forma não toca ("toque F# no baixo")
 */
export function lookupShapes(chord, { siteDiagram = null } = {}) {
  const plain = { ...chord, bass: null };
  let bassNote = null;
  let shapes = [];
  if (chord.bass) {
    shapes = (SLASH_INDEX.get(`${keyOf(plain)}/${mod12(pcOf(chord.bass))}`) ?? []).map((s) => withBase(s, 'open'));
    if (!shapes.length) bassNote = chord.bass;
  }
  if (!shapes.length) shapes = exactShapes(plain);
  if (!shapes.length && siteDiagram) {
    return { shapes: [withBase({ frets: siteDiagram.frets.map((f) => f ?? 'x'), fingers: siteDiagram.frets.map(() => null), unknownStrings: true }, 'site')], approx: null, bassNote };
  }
  if (shapes.length) return { shapes, approx: null, bassNote };

  // Sem forma exata: tenta sem as tensões e, depois, a tríade.
  for (const simpler of [{ ...plain, tensions: [] }, simplifyChord(plain)]) {
    const found = exactShapes(simpler);
    if (found.length) return { shapes: found, approx: `Forma de ${formatBR(simpler)} (sem ${missingText(plain, simpler)})`, bassNote };
  }
  return { shapes: [], approx: null, bassNote };
}

function missingText(full, simpler) {
  const parts = full.tensions.filter((t) => !simpler.tensions.includes(t)).map((t) => `a ${t}ª`);
  if (full.seventh && !simpler.seventh) parts.unshift('a sétima');
  if (full.triad !== simpler.triad) parts.push('a suspensão');
  return parts.join(', ') || 'detalhes';
}

/** Notas (0 a 11) que a forma toca, da corda mais grave para a mais aguda. */
export function shapePitchClasses(frets) {
  return frets.flatMap((f, s) => (typeof f === 'number' ? [mod12(STANDARD_TUNING[s] + f)] : []));
}
