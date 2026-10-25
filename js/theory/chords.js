// Acordes: interpretação (notação BR e americana), formatação e simplificação.
//
// Modelo:
// {
//   root: "C", bass: "E" | null,
//   triad: "maj" | "min" | "dim" | "aug" | "sus2" | "sus4" | "5",
//   seventh: null | "7" | "maj7" | "dim7" | "6",
//   tensions: ["9", "b9", "#9", "11", "#11", "13", "b13", "b5", "#5"]
// }
// Acorde meio-diminuto = triad "dim" + seventh "7".
// "7+" é sétima maior (convenção BR).
// "9" solto, sem sétima e fora de parênteses ("C9"), é ambíguo: nona adicionada no Brasil,
// nona com sétima nos EUA. `options.ninth` escolhe ("add", padrão, ou "dominant"), e o acorde
// recebe `ambiguousNinth: true` para o parser poder conferir com o diagrama do site.

import { parseNote } from './notes.js';

const NOTE_RE = '[A-G](?:##|bb|#|b|♯|♭)?';
const CHORD_RE = new RegExp(`^(${NOTE_RE})(.*?)(?:/(${NOTE_RE}))?$`);

// Ordem importa: alternativas mais longas primeiro.
const TOKEN_RE =
  /maj13|maj11|maj9|maj7|maj|M7|M9|7M|7\+|dim7|°7|º7|dim|min|sus4|sus2|sus|add13|add11|add9|add4|add2|aug|9\+|9-|11\+|b13|#11|\+11|b9|#9|\+9|-9|b5|#5|-5|\+5|13|11|9|7|6|5|4|2|m|-|\+|°|º|ø|M|[()/,.\s]/y;

const TENSION_ORDER = ['b5', '#5', 'b9', '9', '#9', '11', '#11', 'b13', '13'];

export function parseChord(input, { ninth = 'add' } = {}) {
  if (typeof input !== 'string') return null;
  const str = input.trim();
  const m = CHORD_RE.exec(str);
  if (!m) return null;
  const root = parseNote(m[1]);
  const bass = m[3] ? parseNote(m[3]) : null;
  if (!root || (m[3] && !bass)) return null;

  const chord = { root: root.letter + root.accidental, bass: bass ? bass.letter + bass.accidental : null, triad: 'maj', seventh: null, tensions: [] };
  const suffix = m[2];
  if (suffix === '5') return { ...chord, triad: '5' };

  const tensions = new Set();
  const addTension = (t) => tensions.add(t);
  let first = true;
  let depth = 0;
  let ambiguousNinth = false;
  TOKEN_RE.lastIndex = 0;
  while (TOKEN_RE.lastIndex < suffix.length) {
    const start = TOKEN_RE.lastIndex;
    const t = TOKEN_RE.exec(suffix);
    if (!t || t.index !== start) return null;
    const tok = t[0];
    switch (tok) {
      case 'm': case 'min': case '-':
        if (!first || chord.triad !== 'maj') return null;
        chord.triad = 'min'; break;
      case 'dim': case '°': case 'º':
        chord.triad = 'dim'; break;
      case 'dim7': case '°7': case 'º7':
        chord.triad = 'dim'; chord.seventh = 'dim7'; break;
      case 'ø':
        chord.triad = 'dim'; chord.seventh = '7'; break;
      case 'aug': case '+':
        chord.triad = 'aug'; break;
      case 'sus4': case 'sus': case '4': case 'add4':
        if (tok === 'add4') { addTension('11'); break; }
        chord.triad = 'sus4'; break;
      case 'sus2': case '2': case 'add2':
        if (tok === 'add2') { addTension('9'); break; }
        chord.triad = 'sus2'; break;
      case 'maj': case 'maj7': case 'M7': case '7M': case '7+':
        chord.seventh = 'maj7'; break;
      case 'maj9': chord.seventh = 'maj7'; addTension('9'); break;
      case 'maj11': chord.seventh = 'maj7'; addTension('11'); break;
      case 'maj13': chord.seventh = 'maj7'; addTension('13'); break;
      case '7':
        // °7 / dim7 já tratados; "dim" seguido de "7" é diminuto com sétima diminuta.
        chord.seventh = chord.triad === 'dim' && chord.seventh === null && /dim|°|º/.test(suffix.slice(0, start)) ? 'dim7' : '7';
        break;
      case '6':
        if (chord.seventh === null) chord.seventh = '6'; else addTension('13');
        break;
      case '9':
        if (depth === 0 && chord.seventh === null) {
          ambiguousNinth = true;
          if (ninth === 'dominant') chord.seventh = '7';
        }
        addTension('9');
        break;
      case 'add9': addTension('9'); break;
      case '(': depth += 1; break;
      case ')': depth -= 1; break;
      case '11': case 'add11':
        addTension('11');
        if (tok === '11' && chord.seventh === null && tensions.size === 1) chord.seventh = '7';
        break;
      case '13': case 'add13':
        addTension('13');
        if (tok === '13' && chord.seventh === null && tensions.size === 1) chord.seventh = '7';
        break;
      case 'b9': case '-9': case '9-': addTension('b9'); break;
      case '#9': case '+9': case '9+': addTension('#9'); break;
      case '#11': case '+11': case '11+': addTension('#11'); break;
      case 'b13': addTension('b13'); break;
      case 'b5': case '-5':
        if (chord.triad === 'min') chord.triad = 'dim'; else addTension('b5');
        break;
      case '#5': case '+5':
        if (chord.triad === 'maj') chord.triad = 'aug'; else addTension('#5');
        break;
      case '5': return null; // "5" só é válido sozinho (power chord)
      case 'M': break; // 'M' sozinho = maior
      default: break; // ( ) / , . e espaços são separadores
    }
    first = false;
  }
  chord.tensions = TENSION_ORDER.filter((t) => tensions.has(t));
  if (ambiguousNinth) chord.ambiguousNinth = true;
  return chord;
}

function tensionsText(list, sep) {
  return list.length ? `(${list.join(sep)})` : '';
}

/** Formata no padrão brasileiro: C7M, Am7(9), G4, Bm7(b5), C°7, D/F#. */
export function formatBR(c) {
  let s = c.root;
  const tensions = [...c.tensions];
  if (c.triad === 'dim' && c.seventh === '7') {
    s += 'm7';
    tensions.unshift('b5');
  } else {
    s += { maj: '', min: 'm', dim: '°', aug: c.seventh ? '' : '+', sus2: 'sus2', sus4: c.seventh ? '' : '4', 5: '5' }[c.triad];
    if (c.seventh) s += { 7: '7', maj7: '7M', dim7: '7', 6: '6' }[c.seventh];
    if (c.triad === 'aug' && c.seventh) tensions.unshift('#5');
    if (c.triad === 'sus4' && c.seventh) tensions.unshift('4');
  }
  s += tensionsText(tensions, '/');
  return c.bass ? `${s}/${c.bass}` : s;
}

/** Formata no padrão americano: Cmaj7, Am7(9), Gsus4, Bm7b5, Cdim7, D/F#. */
export function formatUS(c) {
  let s = c.root;
  const tensions = [...c.tensions];
  if (c.triad === 'dim' && c.seventh === '7') s += 'm7b5';
  else {
    s += { maj: '', min: 'm', dim: 'dim', aug: 'aug', sus2: 'sus2', sus4: 'sus4', 5: '5' }[c.triad];
    if (c.seventh) s += { 7: '7', maj7: 'maj7', dim7: '7', 6: '6' }[c.seventh];
  }
  if (!c.seventh && tensions.length) s += tensions.map((t) => (/^\d/.test(t) ? `add${t}` : t)).join('');
  else s += tensionsText(tensions, ',');
  return c.bass ? `${s}/${c.bass}` : s;
}

export function formatChord(c, { notation = 'br' } = {}) {
  return notation === 'us' ? formatUS(c) : formatBR(c);
}

/** Am7(9) -> Am, C7M -> C, G4 -> G, D/F# -> D, Bm7(b5) -> B°. */
export function simplifyChord(c) {
  const triad = c.triad === 'sus2' || c.triad === 'sus4' || c.triad === '5' ? 'maj' : c.triad;
  return { root: c.root, bass: null, triad, seventh: null, tensions: [] };
}
