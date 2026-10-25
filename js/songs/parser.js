// Parser: texto bruto (como colado de sites de cifra) -> modelo convertido.
// O modelo não é salvo; é recalculado a cada abertura a partir do texto.
//
// {
//   meta: { title, artist, siteKey, capo, source, ninth },
//   sections: [{ name, blocks }],
//   diagrams: [{ name, baseFret, frets }],   // diagramas ASCII do site, se houver
//   warnings: [{ line, type, text }]
// }
//
// Blocos:
//   { type: "chordLyric", line, items, lyric, segments }
//   { type: "chords", line, label, items, repeat }  // linha só de acordes ("Intro: Am C")
//   { type: "tab", line, lines }                  // tablatura, preservada sem transpor
//   { type: "repeat", line, times }
//   { type: "sectionRef", line, name }            // "Chorus" solto: repita a seção
//   { type: "text", line, label?, text }
//   { type: "blank" }
// items: [{ kind: "chord" | "deco", text, col, chord?, optional? }]

import { parseChord } from '../theory/chords.js';
import { pcOf } from '../theory/notes.js';
import { parseKey } from '../theory/transpose.js';

const SECTION_WORDS = [
  'intro', 'introdução', 'introducao', 'verse', 'verso', 'estrofe', 'pre-chorus', 'pré-refrão', 'pre-refrão',
  'pre-refrao', 'chorus', 'refrão', 'refrao', 'refrain', 'bridge', 'ponte', 'solo', 'instrumental', 'interlude',
  'interlúdio', 'interludio', 'outro', 'final', 'fim', 'coda', 'tag', 'riff', 'part', 'parte', 'hook', 'break',
  'ending', 'base',
].join('|');

const ORDINAL = '(?:\\d+(?:st|nd|rd|th|ª|º|a|o)?\\s+)?';
const SECTION_RE = new RegExp(`^${ORDINAL}(?:guitar\\s+|guitarra\\s+)?(?:${SECTION_WORDS})(?![\\p{L}])`, 'iu');

const DECO = new Set(['|', '||', '|:', ':|', '{:', ':}', '(', ')', '[', ']', '->', '-', '–', '—', '/', '%', '...', '..', '*']);
const REPEAT_RE = /\(\s*(?:repeat\s*|repete\s*|repetir\s*)?(?:x\s*(\d+)|(\d+)\s*x)\s*\)|(?<![\w])(?:x(\d+)|(\d+)x)(?![\w])/gi;

const NOISE_RE = /e-chords\.com|cifraclub|cifras\.com\.br|^\s*(?:por|email|e-mail|contribuição|contribuicao|enviado por)\s*:|[\w.+-]+@[\w-]+\.[\w.]+/i;
const SEPARATOR_RE = /^\s*[-_=~*]{3,}\s*$/;
const HEADER_RE = /^(.+?)\s+-\s+(.+?)(?:\s*\((?:chords|cifra|cifras|tab|tabs)\))?\s*$/i;
const KEY_RE = /^\s*(?:tom|key|tonalidade)\s*:\s*(\S+)\s*$/i;
const CAPO_RE = /^\s*capo(?:traste)?\s*(?:na\s+|on\s+)?:?\s*(\d{1,2})\s*(?:ª|a|st|nd|rd|th)?\s*(?:casa|fret)?\s*$/i;
const GRID_RE = /^\s*(?:\d+\s+)?[|o]{6}(?:\s+(?:\d+\s+)?[|o]{6})*\s*$/;
const TAB_PREFIX_RE = /^\s*[eEbBgGdDaA]?\s*[|:]?/;
const TAB_BODY_RE = /^[-–0-9hpbrsxX/\\~|()^.*\s]+$/;
const SHAPE_TOKEN_RE = /^(?:[xX0-9]{6}|->)$/;
const INLINE_RE = /[([{]\s*([^()[\]{}\s]+)\s*[)\]}]/g;

export function normalizeText(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => expandTabs(line).replace(/\s+$/, ''));
}

function expandTabs(line, size = 8) {
  let out = '';
  for (const ch of line) {
    out += ch === '\t' ? ' '.repeat(size - (out.length % size)) : ch;
  }
  return out;
}

function tokensWithCols(line) {
  return [...line.matchAll(/\S+/g)].map((m) => ({ text: m[0], col: m.index }));
}

function blankOut(line, regex) {
  let times = null;
  const cleaned = line.replace(regex, (match, a, b, c, d) => {
    times = Number(a || b || c || d);
    return ' '.repeat(match.length);
  });
  return { cleaned, times };
}

const isSectionHeaderText = (s) => SECTION_RE.test(s) && s.length <= 40;

/** Interpreta um token como acorde, aceitando parênteses em volta: "(F#°7)" -> opcional. */
function chordToken(text, opts) {
  if (/^n\.?c\.?$/i.test(text)) return { chord: null, optional: false };
  const chord = parseChord(text, opts);
  if (chord) return { chord, optional: false };
  const m = /^\((.+)\)$/.exec(text);
  if (m) {
    const inner = parseChord(m[1], opts);
    if (inner) return { chord: inner, optional: true };
  }
  return null;
}

/** Acorde grudado em decoração: "{A", "D}", "|Am", "A------". Retorna { chord, offset } ou null. */
function decoratedChordToken(text, opts) {
  const m = /^([({[|:]*)(.+?)([)}\]|:]*|-{2,})$/.exec(text);
  if (!m || (!m[1] && !m[3])) return null;
  const chord = parseChord(m[2], opts);
  return chord ? { chord, offset: m[1].length, core: m[2] } : null;
}

/**
 * Tenta ler a linha como linha de acordes.
 * Retorna { items, repeat, label } ou { nearMiss: [tokens desconhecidos] } ou null.
 */
export function readChordLine(line, opts = {}) {
  const { cleaned, times } = blankOut(line, REPEAT_RE);
  const tokens = tokensWithCols(cleaned);
  if (!tokens.length) return null;

  // Rótulo opcional no início: "Intro:", "SOLO", "Part II Guitar Solo", "Intro (Solo):"
  let label = null;
  let start = 0;
  const firstChordIdx = tokens.findIndex((t) => chordToken(t.text, opts) || DECO.has(t.text));
  if (firstChordIdx > 0 && firstChordIdx <= 5) {
    const candidate = tokens.slice(0, firstChordIdx).map((t) => t.text).join(' ');
    if (isSectionHeaderText(candidate.replace(/[():]/g, '').trim()) || /:$/.test(candidate)) {
      label = candidate.replace(/:$/, '').replace(/^\((.*)\)$/, '$1').trim();
      start = firstChordIdx;
    }
  }

  const items = [];
  const unknown = [];
  for (const t of tokens.slice(start)) {
    const ct = chordToken(t.text, opts);
    const dt = ct ? null : decoratedChordToken(t.text, opts);
    if (ct) items.push({ kind: 'chord', text: t.text, col: t.col, chord: ct.chord, optional: ct.optional });
    else if (dt) items.push({ kind: 'chord', text: dt.core, col: t.col + dt.offset, chord: dt.chord, optional: false, raw: t.text });
    else if (DECO.has(t.text)) items.push({ kind: 'deco', text: t.text, col: t.col });
    else unknown.push(t.text);
  }
  const chordCount = items.filter((i) => i.kind === 'chord').length;
  if (!chordCount) return null;
  if (unknown.length) {
    return chordCount / (chordCount + unknown.length) >= 0.6 ? { nearMiss: unknown } : null;
  }
  return { items, repeat: times, label };
}

function isShapeLine(line) {
  const tokens = line.trim().split(/\s+/);
  return tokens.some((t) => /^[xX0-9]{6}$/.test(t)) && tokens.every((t) => SHAPE_TOKEN_RE.test(t));
}

/** "e|--0--|", "|-----|", "G -4---5---7--" (corda opcional, ao menos 4 traços). */
function isTabLine(line) {
  const body = line.replace(TAB_PREFIX_RE, '');
  return (TAB_BODY_RE.test(body) && (body.match(/-/g) || []).length >= 4) || isShapeLine(line);
}

/** Segmentos { chord, text } para o renderizador do celular. */
export function buildSegments(items, lyric) {
  const chords = items.filter((i) => i.kind === 'chord');
  const segments = [];
  if (!chords.length || chords[0].col > 0) {
    segments.push({ chord: null, text: lyric.slice(0, chords.length ? chords[0].col : undefined) });
  }
  chords.forEach((c, idx) => {
    const end = idx + 1 < chords.length ? chords[idx + 1].col : undefined;
    segments.push({ chord: c.text, text: lyric.slice(c.col, end) });
  });
  return segments.filter((s, idx) => s.chord !== null || s.text !== '' || idx > 0);
}

/** Converte "My (E) child arrived" em itens de acorde + letra limpa. */
function readInline(line, opts) {
  let lyric = '';
  const items = [];
  let last = 0;
  let found = false;
  for (const m of line.matchAll(INLINE_RE)) {
    const ct = chordToken(m[1], opts);
    if (!ct || !ct.chord) continue;
    found = true;
    lyric += line.slice(last, m.index);
    let next = m.index + m[0].length;
    if ((lyric === '' || lyric.endsWith(' ')) && line[next] === ' ') next += 1;
    items.push({ kind: 'chord', text: m[1], col: lyric.length, chord: ct.chord, optional: false });
    last = next;
  }
  if (!found) return null;
  lyric += line.slice(last);
  return { items, lyric: lyric.replace(/\s+$/, '') };
}

// Acordes soltos no meio da letra ("went C7 out", "to F Jackson").
// Só convertemos a linha se houver ao menos um acorde que não pode ser palavra (C7, Bm, F#).
// "A", "E", "Am" e "Em" nunca são convertidos: são palavras em português ou inglês.
const WORD_LIKE_CHORDS = new Set(['A', 'E', 'Am', 'Em']);

function readBareInline(line, opts, { force = false } = {}) {
  const candidates = tokensWithCols(line).filter((t) => parseChord(t.text, opts));
  const strong = candidates.some((t) => t.text.length >= 2 && !WORD_LIKE_CHORDS.has(t.text));
  if (!strong && !force) return null;
  const convert = candidates.filter((t) => !WORD_LIKE_CHORDS.has(t.text));
  let lyric = '';
  let last = 0;
  const items = [];
  const removed = [];
  for (const t of convert) {
    lyric += line.slice(last, t.col);
    let next = t.col + t.text.length;
    if ((lyric === '' || lyric.endsWith(' ')) && line[next] === ' ') next += 1;
    items.push({ kind: 'chord', text: t.text, col: lyric.length, chord: parseChord(t.text, opts), optional: false });
    removed.push({ col: t.col, len: next - t.col });
    last = next;
  }
  lyric += line.slice(last);
  const skipped = candidates.filter((t) => WORD_LIKE_CHORDS.has(t.text)).map((t) => t.text);
  return { items, lyric: lyric.replace(/\s+$/, ''), skipped, removed };
}

/** Acordes marcados ("(E)", "{C}") e, na mesma linha, os soltos ("to F Jackson"). */
function readInlineChords(line, opts) {
  const marked = readInline(line, opts);
  if (!marked) return readBareInline(line, opts);
  const bare = readBareInline(marked.lyric, opts, { force: true });
  if (!bare.items.length) return marked;
  const shift = (col) => col - bare.removed.filter((r) => r.col < col).reduce((sum, r) => sum + Math.min(r.len, col - r.col), 0);
  const items = [...marked.items.map((it) => ({ ...it, col: shift(it.col) })), ...bare.items].sort((a, b) => a.col - b.col);
  return { items, lyric: bare.lyric, skipped: bare.skipped };
}

// Letra solta que pode ter acorde: só gera aviso.
const BARE_CHORD_RE = /(?:^|\s)([A-G](?:#|b)?(?:m|maj|dim|sus|add|°)?\d[^\s]*|[BCDFG])(?=\s|$)/;

// Origem do texto -> convenção de "C9". Sites americanos: nona com sétima.
const SOURCES = [
  [/ultimate-?guitar/i, 'ultimate-guitar', 'dominant'],
  [/chordie|azchords|songsterr|chordu/i, 'us-site', 'dominant'],
  [/e-chords/i, 'e-chords', 'add'],
  [/cifraclub|cifra club/i, 'cifraclub', 'add'],
  [/cifras\.com\.br/i, 'cifras', 'add'],
];

function detectSource(lines) {
  for (const line of lines) {
    for (const [re, source, ninth] of SOURCES) if (re.test(line)) return { source, ninth };
  }
  if (lines.some((l) => /^\s*key\s*:/i.test(l))) return { source: null, ninth: 'dominant' };
  return { source: null, ninth: 'add' };
}

const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];

/** Notas (0 a 11) de um diagrama do site; cordas sem marca ficam de fora. */
function diagramPitchClasses(diagram) {
  return diagram.frets.flatMap((f, s) => (f === null ? [] : [(STANDARD_TUNING[s] + f) % 12]));
}

/** "C9" ambíguo: se o site desenhou o acorde, a presença da sétima menor decide. */
function resolveNinthsWithDiagrams(sections, diagrams) {
  const byName = new Map(diagrams.map((d) => [d.name, d]));
  for (const s of sections) {
    for (const b of s.blocks) {
      for (const it of b.items ?? []) {
        const d = it.kind === 'chord' && it.chord?.ambiguousNinth && byName.get(it.text);
        if (!d) continue;
        const rootPc = pcOf(it.chord.root);
        const hasMinorSeventh = diagramPitchClasses(d).includes((rootPc + 10) % 12);
        it.chord = { ...it.chord, seventh: hasMinorSeventh ? '7' : null };
        it.ninthFrom = 'diagram';
      }
    }
  }
}

function parseDiagrams(nameLine, gridLines) {
  return tokensWithCols(nameLine).map(({ text, col }) => {
    let baseFret = 1;
    const frets = Array(6).fill(null);
    gridLines.forEach((row, r) => {
      const block = row.slice(col, col + 6);
      const prefix = row.slice(Math.max(0, col - 3), col).trim();
      if (r === 0 && /^\d+$/.test(prefix)) baseFret = Number(prefix);
      [...block].forEach((ch, s) => {
        if (ch === 'o' && frets[s] === null) frets[s] = r;
      });
    });
    return { name: text, baseFret, frets: frets.map((f) => (f === null ? null : f + baseFret)) };
  });
}

export function parseSong(text) {
  const lines = normalizeText(text);
  const { source, ninth } = detectSource(lines);
  const opts = { ninth };
  const meta = { title: null, artist: null, siteKey: null, capo: null, source, ninth };
  const sections = [];
  const diagrams = [];
  const warnings = [];
  let section = { name: null, blocks: [] };

  const push = (block) => section.blocks.push(block);
  const openSection = (name) => {
    if (section.name !== null || section.blocks.some((b) => b.type !== 'blank')) sections.push(section);
    section = { name, blocks: [] };
  };

  const firstContent = lines.findIndex((l) => l.trim() !== '');
  // Quem usa "Refrão:" com dois-pontos para abrir seção costuma usar "Refrão" solto como "repita".
  const usesColonHeaders = lines.some((l) => {
    const m = /^\s*([^:]{1,40}):\s*$/.exec(l);
    return m && isSectionHeaderText(m[1].trim());
  });
  const sectionExists = (name) =>
    [...sections, section].some((s) => s.name?.toLowerCase() === name.toLowerCase());
  const isLyricCandidate = (l) =>
    l !== undefined && l.trim() !== '' && !readChordLine(l, opts)?.items && !isTabLine(l) && !GRID_RE.test(l) &&
    !SEPARATOR_RE.test(l) && !NOISE_RE.test(l) && !isSectionHeaderText(l.trim().replace(/^[[(]|[\])]$|:$/g, '').trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNo = i + 1;

    if (trimmed === '') {
      const last = section.blocks[section.blocks.length - 1];
      if (last && last.type !== 'blank') push({ type: 'blank' });
      continue;
    }
    if (i === firstContent && HEADER_RE.test(trimmed) && !readChordLine(line, opts)?.items) {
      const [, artist, title] = HEADER_RE.exec(trimmed);
      Object.assign(meta, { artist, title });
      continue;
    }
    if (SEPARATOR_RE.test(line) || NOISE_RE.test(line)) continue;
    let m;
    if ((m = KEY_RE.exec(line))) { meta.siteKey = parseKey(m[1]); continue; }
    if ((m = CAPO_RE.exec(line))) { meta.capo = Number(m[1]); continue; }

    const chordLine = readChordLine(line, opts);

    // Diagramas ASCII do site: linha de nomes seguida de linhas de grade.
    if (chordLine?.items && GRID_RE.test(lines[i + 1] ?? '')) {
      const grid = [];
      let j = i + 1;
      while (j < lines.length && GRID_RE.test(lines[j])) grid.push(lines[j++]);
      diagrams.push(...parseDiagrams(line, grid));
      i = j - 1;
      continue;
    }
    if (GRID_RE.test(line)) continue;

    // Cabeçalho de seção: "[Refrão]", "Verse 1:", "Chorus", "(Part IV)", "Intro Solo"
    const bracket = /^\[(.+)\]$/.exec(trimmed);
    const headerText = trimmed.replace(/^\(|\)$/g, '').replace(/:$/, '').trim();
    if (bracket || (!chordLine?.items && isSectionHeaderText(headerText) && !/:\s*\S/.test(trimmed))) {
      const name = bracket ? bracket[1].trim() : headerText;
      // "Chorus" ou "(solo)" solto, seguido de linha vazia: marcador de repetição, não seção nova.
      const bare = !bracket && !trimmed.endsWith(':');
      const nextBlank = (lines[i + 1] ?? '').trim() === '';
      if (bare && nextBlank && (/^\(.*\)$/.test(trimmed) || sectionExists(name) || usesColonHeaders)) {
        push({ type: 'sectionRef', line: lineNo, name });
      } else {
        openSection(name);
      }
      continue;
    }
    // "Verse:" seguido de sublinhado "------"
    if (!chordLine?.items && /^[^:]{1,30}:$/.test(trimmed) && SEPARATOR_RE.test(lines[i + 1] ?? '')) {
      openSection(trimmed.slice(0, -1).trim());
      continue;
    }
    // "TAG: We got married..." -> texto com rótulo
    const labeled = /^\s*([^:]{1,30}):\s*(.+)$/.exec(line);
    if (labeled && !chordLine?.items && isSectionHeaderText(labeled[1].trim())) {
      push({ type: 'text', line: lineNo, label: labeled[1].trim(), text: labeled[2] });
      continue;
    }

    if (isTabLine(line)) {
      const tab = [];
      let j = i;
      while (j < lines.length && lines[j].trim() !== '' && isTabLine(lines[j])) tab.push(lines[j++]);
      push({ type: 'tab', line: lineNo, lines: tab });
      i = j - 1;
      continue;
    }

    if (chordLine?.items) {
      const next = lines[i + 1];
      if (!chordLine.label && chordLine.repeat === null && isLyricCandidate(next)) {
        push({ type: 'chordLyric', line: lineNo, items: chordLine.items, lyric: next, segments: buildSegments(chordLine.items, next) });
        i += 1;
      } else {
        push({ type: 'chords', line: lineNo, label: chordLine.label, items: chordLine.items, repeat: chordLine.repeat });
      }
      continue;
    }
    if (chordLine?.nearMiss) {
      warnings.push({ line: lineNo, type: 'unknownChord', text: chordLine.nearMiss.join(' ') });
    }

    const repeatOnly = blankOut(line, REPEAT_RE);
    if (repeatOnly.times !== null && repeatOnly.cleaned.trim() === '') {
      push({ type: 'repeat', line: lineNo, times: repeatOnly.times });
      continue;
    }

    const inline = readInlineChords(line, opts);
    if (inline) {
      push({ type: 'chordLyric', line: lineNo, items: inline.items, lyric: inline.lyric, segments: buildSegments(inline.items, inline.lyric) });
      for (const text of inline.skipped ?? []) warnings.push({ line: lineNo, type: 'bareInlineChord', text });
      continue;
    }

    const bare = BARE_CHORD_RE.exec(line);
    if (bare && parseChord(bare[1], opts)) {
      warnings.push({ line: lineNo, type: 'bareInlineChord', text: bare[1] });
    }
    push({ type: 'text', line: lineNo, text: line });
  }
  sections.push(section);

  for (const s of sections) {
    while (s.blocks.length && s.blocks[s.blocks.length - 1].type === 'blank') s.blocks.pop();
  }
  resolveNinthsWithDiagrams(sections, diagrams);
  return { meta, sections: sections.filter((s) => s.name !== null || s.blocks.length), diagrams, warnings };
}

/**
 * Todos os acordes da música, na ordem em que aparecem (para detectar o tom).
 * [{ chord, lineStart, lineEnd }]
 */
export function songChords(parsed) {
  const out = [];
  for (const s of parsed.sections) {
    for (const b of s.blocks) {
      if (!b.items) continue;
      const chords = b.items.filter((it) => it.kind === 'chord' && it.chord && !it.optional);
      chords.forEach((it, idx) => out.push({ chord: it.chord, lineStart: idx === 0, lineEnd: idx === chords.length - 1 }));
    }
  }
  return out;
}
