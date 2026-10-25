// Análise harmônica por regras: grau, função, campo harmônico, substituições, caráter e dica.
// Tom: { tonic, mode }. Os textos ficam nas tabelas abaixo, para revisão fácil.

import { formatBR } from './chords.js';
import { latinName, mod12, pcOf, spellInterval } from './notes.js';
import { SCALES, ownScale, parallelScale, triadOnDegree } from './scales.js';
import { DEGREE_STEPS, formatKey, spellInKey } from './transpose.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const DEGREE_FUNCTION = { 1: 'tonic', 2: 'subdominant', 3: 'tonic', 4: 'subdominant', 5: 'dominant', 6: 'tonic', 7: 'dominant' };

export const FUNCTION_NAMES = { tonic: 'Tônica', subdominant: 'Subdominante', dominant: 'Dominante' };

export const FUNCTION_TEXT = {
  tonic: 'Tônica: repouso e estabilidade, ponto de chegada.',
  subdominant: 'Subdominante: movimento e preparação, tensão intermediária.',
  dominant: 'Dominante: tensão que pede resolução na tônica.',
};

export const KIND_TEXT = {
  diatonic: 'Pertence ao campo harmônico.',
  harmonic: 'Vem da escala menor harmônica (sétima elevada).',
  melodic: 'Vem da escala menor melódica (sexta e sétima elevadas).',
  secondaryDominant: 'Dominante secundária: prepara um acorde do campo que não é a tônica.',
  borrowed: 'Empréstimo modal: acorde do tom homônimo.',
  chromatic: 'Fora do campo harmônico.',
};

// Caráter e dica por grau. Estabilidade e tensão de 0 a 5. {X} = nome do acorde.
// "grau:tríade" vale antes do grau sozinho: em tom menor, o V maior (harmônica) não é o v menor.
const CHARACTER = {
  major: {
    1: [5, 0, ['Repouso', 'Resolução'], '{X} é a casa: tudo resolve aqui.'],
    2: [3, 2, ['Movimento', 'Preparação'], '{X} costuma preparar o V.'],
    3: [4, 1, ['Repouso suave', 'Cor'], '{X} prolonga a tônica com outra cor.'],
    4: [3, 3, ['Movimento', 'Preparação'], '{X} cria movimento e prepara a chegada da tensão.'],
    5: [1, 4, ['Tensão', 'Pede resolução'], '{X} pede para voltar ao I.'],
    6: [4, 1, ['Repouso', 'Melancolia'], '{X} é o repouso com cara menor.'],
    7: [0, 5, ['Tensão máxima', 'Instável'], '{X} resolve com força no I.'],
  },
  minor: {
    1: [5, 0, ['Repouso', 'Resolução'], '{X} é a casa: tudo resolve aqui.'],
    2: [1, 4, ['Tensão', 'Preparação'], '{X} prepara o V com um tom sombrio.'],
    3: [4, 1, ['Repouso suave', 'Luz'], '{X} é o relativo maior: um respiro claro.'],
    4: [3, 3, ['Movimento', 'Melancolia'], '{X} afasta da tônica com peso.'],
    '2:min': [3, 2, ['Movimento', 'Preparação'], '{X} vem da menor melódica e prepara o V com menos peso.'],
    '4:maj': [3, 2, ['Movimento', 'Luz'], '{X} vem da menor melódica: um IV maior que clareia antes da volta.'],
    5: [2, 2, ['Movimento', 'Suave'], '{X} prepara a volta sem tensão forte.'],
    '5:maj': [1, 4, ['Tensão', 'Pede resolução'], '{X} pede para voltar ao i.'],
    6: [3, 2, ['Movimento', 'Cor'], '{X} abre espaço e cor antes da volta.'],
    7: [2, 3, ['Movimento', 'Preparação'], '{X} costuma levar ao III ou de volta ao i.'],
    '7:dim': [0, 5, ['Tensão máxima', 'Instável'], '{X} resolve com força no i.'],
  },
  secondaryDominant: [1, 4, ['Tensão', 'Direção'], '{X} aponta para {T}: resolva nele.'],
  borrowed: [2, 2, ['Cor', 'Surpresa'], '{X} vem de {B} e muda a cor da música.'],
  chromatic: [2, 3, ['Surpresa', 'Fora do tom'], '{X} não pertence a {K}: confira se a música mudou de tom.'],
};

const characterEntry = (mode, degree, chord) => CHARACTER[mode][`${degree}:${chord.triad}`] ?? CHARACTER[mode][degree];

const TRIAD_LABEL = { maj: 'Maior', min: 'Menor', dim: 'Diminuto', aug: 'Aumentado', sus2: 'Suspenso', sus4: 'Suspenso', 5: 'Neutro' };

export const keyName = (key) => `${formatKey(key).replace(/m$/, '')} ${key.mode === 'major' ? 'maior' : 'menor'}`;

const makeChord = (root, triad, seventh = null) => ({ root, bass: null, triad, seventh, tensions: [] });

/** Algarismo romano: minúsculo para menor e diminuto; ° diminuto, ø meio-diminuto. */
function romanNumeral(chord, degree, accidental = '') {
  const lower = chord.triad === 'min' || chord.triad === 'dim';
  let s = accidental + (lower ? ROMAN[degree - 1].toLowerCase() : ROMAN[degree - 1]);
  if (chord.triad === 'dim') s += chord.seventh === '7' ? 'ø' : chord.seventh === 'dim7' ? '°7' : '°';
  else if (chord.triad === 'aug') s += '+';
  if (chord.triad !== 'dim') s += { 7: '7', maj7: '7M', 6: '6' }[chord.seventh] ?? '';
  return s;
}

function fieldChord(key, scale, index, source = 'diatonic') {
  const pc = mod12(pcOf(key.tonic) + scale[index]);
  const chord = makeChord(spellInKey(pc, key), triadOnDegree(scale, index));
  return { chord, degree: index + 1, roman: romanNumeral(chord, index + 1), function: DEGREE_FUNCTION[index + 1], source };
}

/** Campo harmônico: 7 acordes da escala própria; em tom menor, mais os da harmônica e da melódica. */
export function harmonicField(key) {
  const scale = ownScale(key);
  const main = scale.map((_, i) => fieldChord(key, scale, i));
  const extra =
    key.mode === 'minor'
      ? [
          fieldChord(key, SCALES.harmonicMinor, 4, 'harmonic'),
          fieldChord(key, SCALES.harmonicMinor, 6, 'harmonic'),
          fieldChord(key, SCALES.melodicMinor, 3, 'melodic'),
          fieldChord(key, SCALES.melodicMinor, 1, 'melodic'),
        ]
      : [];
  return { main, extra };
}

// ---------- Estrutura do acorde ----------

const TRIAD_TONES = {
  maj: [[0, 0], [2, 4], [4, 7]],
  min: [[0, 0], [2, 3], [4, 7]],
  dim: [[0, 0], [2, 3], [4, 6]],
  aug: [[0, 0], [2, 4], [4, 8]],
  sus2: [[0, 0], [1, 2], [4, 7]],
  sus4: [[0, 0], [3, 5], [4, 7]],
  5: [[0, 0], [4, 7]],
};
const SEVENTH_TONE = { 7: [6, 10], maj7: [6, 11], dim7: [6, 9], 6: [5, 9] };
const TENSION_TONE = { 9: [1, 14], b9: [1, 13], '#9': [1, 15], 11: [3, 17], '#11': [3, 18], 13: [5, 21], b13: [5, 20] };

const INTERVAL_NAMES = {
  '0:0': 'Fundamental', '1:2': 'Segunda maior', '2:3': 'Terça menor', '2:4': 'Terça maior', '3:5': 'Quarta justa',
  '4:6': 'Quinta diminuta', '4:7': 'Quinta justa', '4:8': 'Quinta aumentada', '5:9': 'Sexta maior',
  '6:9': 'Sétima diminuta', '6:10': 'Sétima menor', '6:11': 'Sétima maior',
};
// Rótulo curto do intervalo: 1, b3, 3, 5, b7...
const DEGREE_LABEL = {
  '0:0': '1', '1:2': '2', '2:3': 'b3', '2:4': '3', '3:5': '4', '4:6': 'b5', '4:7': '5', '4:8': '#5',
  '5:9': '6', '6:9': 'bb7', '6:10': 'b7', '6:11': '7',
};
const TENSION_NAMES = {
  9: 'Nona maior', b9: 'Nona menor', '#9': 'Nona aumentada', 11: 'Décima primeira', '#11': 'Décima primeira aumentada',
  13: 'Décima terceira', b13: 'Décima terceira menor',
};

/** Notas do acorde, em ordem: [{ steps, semitones, interval, tension? }] (sem nomes). */
function chordStructure(chord) {
  const tones = TRIAD_TONES[chord.triad].map(([steps, semitones]) => ({ steps, semitones }));
  const fifth = tones.find((t) => t.steps === 4);
  if (fifth && chord.tensions.includes('b5')) fifth.semitones = 6;
  if (fifth && chord.tensions.includes('#5')) fifth.semitones = 8;
  if (chord.seventh) {
    const [steps, semitones] = chord.triad === 'dim' && chord.seventh === '7' ? [6, 10] : SEVENTH_TONE[chord.seventh];
    tones.push({ steps, semitones });
  }
  for (const t of chord.tensions) {
    if (TENSION_TONE[t]) tones.push({ steps: TENSION_TONE[t][0], semitones: TENSION_TONE[t][1], tension: t });
  }
  return tones.map((t) => ({ ...t, interval: t.tension ? TENSION_NAMES[t.tension] : INTERVAL_NAMES[`${t.steps}:${t.semitones}`] }));
}

/** Notas com nome, grafadas pela letra do intervalo (C°7 = C Eb Gb Bbb). */
export function chordNotes(chord) {
  return chordStructure(chord).map((t) => {
    const name = spellInterval(chord.root, t.semitones, t.steps) ?? chord.root;
    return { name, latin: latinName(name), interval: t.interval, label: t.tension ?? DEGREE_LABEL[`${t.steps}:${t.semitones}`], semitones: t.semitones, tension: Boolean(t.tension) };
  });
}

/** Índices cromáticos das notas do acorde (sem tensões), para comparar com escalas. */
const corePcs = (chord) => chordStructure(chord).filter((t) => !t.tension).map((t) => mod12(pcOf(chord.root) + t.semitones));

const SEVENTH_QUALITY = {
  null: { maj: 'Tríade maior', min: 'Tríade menor', dim: 'Tríade diminuta', aug: 'Tríade aumentada', sus4: 'Suspenso (4ª)', sus2: 'Suspenso (2ª)', 5: 'Power chord (quinta)' },
  7: { maj: 'Tétrade com sétima', min: 'Tétrade menor com sétima', dim: 'Meio-diminuto', aug: 'Aumentado com sétima', sus4: 'Suspenso (4ª) com sétima', sus2: 'Suspenso (2ª) com sétima' },
  maj7: { maj: 'Tétrade com sétima maior', min: 'Menor com sétima maior', aug: 'Aumentado com sétima maior', sus4: 'Suspenso (4ª) com sétima maior', sus2: 'Suspenso (2ª) com sétima maior' },
  dim7: { dim: 'Diminuto com sétima' },
  6: { maj: 'Tríade maior com sexta', min: 'Tríade menor com sexta', sus4: 'Suspenso (4ª) com sexta', sus2: 'Suspenso (2ª) com sexta' },
};
const TENSION_WORD = { 9: 'nona', b9: 'nona menor', '#9': 'nona aumentada', 11: 'décima primeira', '#11': 'décima primeira aumentada', 13: 'décima terceira', b13: 'décima terceira menor' };

export function chordQuality(chord) {
  const base = SEVENTH_QUALITY[chord.seventh]?.[chord.triad] ?? 'Acorde';
  const extras = chord.tensions.filter((t) => TENSION_WORD[t]).map((t) => TENSION_WORD[t]);
  if (!extras.length) return base;
  return `${base}${base.includes('sétima') || base.includes('sexta') || base === 'Meio-diminuto' ? ' e ' : ' com '}${extras.join(' e ')}`;
}

// ---------- Análise ----------

function degreeOf(offset, scale) {
  const degree = DEGREE_STEPS[offset] + 1;
  const diff = offset - scale[degree - 1];
  return { degree, accidental: diff === -1 ? 'b' : diff === 1 ? '#' : diff === 0 ? '' : null };
}

const inScale = (offsets, scale) => offsets.every((o) => scale.includes(o));
const isDominantShape = (c) => c.triad === 'maj' && (c.seventh === null || c.seventh === '7');

function inversionOf(chord) {
  if (!chord.bass) return null;
  const tone = chordStructure(chord).find((t) => !t.tension && mod12(pcOf(chord.root) + t.semitones) === pcOf(chord.bass));
  const label = !tone || tone.steps === 0 ? 'Baixo fora do acorde (pedal ou passagem)'
    : tone.steps <= 3 ? '1ª inversão (terça no baixo)'
    : tone.steps === 4 ? '2ª inversão (quinta no baixo)'
    : '3ª inversão (sétima no baixo)';
  return { bass: chord.bass, label };
}

function substitutions(chord, key, field, isDominant) {
  const out = [];
  const rootPc = pcOf(chord.root);
  // semitons e passos de letra a partir da fundamental: fora do campo, a grafia segue o intervalo
  // (vii° de A7 é C#°, a sensível de Ré; o trítono de G7 é Db7).
  const add = (semitones, steps, triad, label, { onlyInField = true, seventh = null } = {}) => {
    const pc = mod12(rootPc + semitones);
    const f = field.main.find((x) => pcOf(x.chord.root) === pc && x.chord.triad === triad);
    if (!f && onlyInField) return;
    const name = spellInterval(chord.root, semitones, steps) ?? spellInKey(pc, key);
    out.push({ chord: f && !seventh ? f.chord : makeChord(name, triad, seventh), roman: f ? f.roman : '', label });
  };
  if (chord.triad === 'maj') {
    add(9, 5, 'min', 'Relativo');
    add(4, 2, 'min', 'Antirrelativo');
  } else if (chord.triad === 'min') {
    add(3, 2, 'maj', 'Relativo');
    add(8, 5, 'maj', 'Antirrelativo');
  }
  if (isDominant) {
    add(6, 4, 'maj', 'Substituto trítono', { onlyInField: false, seventh: '7' });
    add(4, 2, 'dim', 'Sétimo grau', { onlyInField: false });
  }
  return out;
}

function character(entry, chord, names) {
  const [stability, tension, tags, tip] = entry;
  return {
    character: { label: TRIAD_LABEL[chord.triad], tags, stability, tension },
    tip: tip.replace(/\{([XTBK])\}/g, (_, k) => names[k] ?? ''),
  };
}

/**
 * Analisa o acorde no tom. Retorna:
 * { kind, degree, roman, function, quality, notes, character, substitutions, tip, inversion, target?, borrowedFrom? }
 * kind: diatonic | harmonic | melodic | secondaryDominant | borrowed | chromatic
 */
export function analyzeChord(chord, key) {
  const tonicPc = pcOf(key.tonic);
  const offset = mod12(pcOf(chord.root) - tonicPc);
  const tones = corePcs(chord).map((pc) => mod12(pc - tonicPc));
  const own = ownScale(key);
  const field = harmonicField(key);
  const { degree, accidental } = degreeOf(offset, own);
  const X = formatBR({ ...chord, bass: null });
  const base = { degree, quality: chordQuality(chord), notes: chordNotes(chord), inversion: inversionOf(chord), target: null, borrowedFrom: null };

  const result = (kind, extra) => {
    const fn = extra.function ?? null;
    // Trítono e sétimo grau só para dominantes: V (maior, com ou sem 7) e dominantes secundárias.
    const isDominant = kind === 'secondaryDominant' || (degree === 5 && fn === 'dominant' && isDominantShape(chord));
    return { ...base, kind, ...extra, function: fn, substitutions: substitutions(chord, key, field, isDominant) };
  };

  if (accidental === '' && inScale(tones, own)) {
    return result('diatonic', { roman: romanNumeral(chord, degree), function: DEGREE_FUNCTION[degree], ...character(characterEntry(key.mode, degree, chord), chord, { X }) });
  }
  if (key.mode === 'minor') {
    for (const [kind, scale] of [['harmonic', SCALES.harmonicMinor], ['melodic', SCALES.melodicMinor]]) {
      if (scale.includes(offset) && inScale(tones, scale)) {
        return result(kind, { roman: romanNumeral(chord, degree), function: DEGREE_FUNCTION[degree], ...character(characterEntry('minor', degree, chord), chord, { X }) });
      }
    }
  }
  // Dominante secundária: maior (com ou sem 7) que resolve uma quinta abaixo num acorde maior ou menor do campo.
  // Sobre a tônica, só com sétima (A7 em Am = V7/iv; A em Am é empréstimo).
  if (isDominantShape(chord) && (offset !== 0 || chord.seventh === '7')) {
    const target = field.main.find((f) => mod12(pcOf(f.chord.root) - tonicPc) === mod12(offset + 5));
    if (target && target.chord.triad !== 'dim' && target.degree !== 1) {
      const T = formatBR(target.chord);
      return result('secondaryDominant', {
        roman: `${chord.seventh === '7' ? 'V7' : 'V'}/${target.roman}`,
        function: 'dominant',
        target,
        ...character(CHARACTER.secondaryDominant, chord, { X, T }),
      });
    }
  }
  const parallel = parallelScale(key);
  if (parallel.includes(offset) && inScale(tones, parallel)) {
    const B = keyName({ tonic: key.tonic, mode: key.mode === 'major' ? 'minor' : 'major' });
    const fn = key.mode === 'major' && (degree === 6 || degree === 7) ? 'subdominant' : DEGREE_FUNCTION[degree];
    return result('borrowed', { roman: romanNumeral(chord, degree, accidental ?? ''), function: fn, borrowedFrom: B, ...character(CHARACTER.borrowed, chord, { X, B }) });
  }
  return result('chromatic', { roman: romanNumeral(chord, degree, accidental ?? ''), function: null, ...character(CHARACTER.chromatic, chord, { X, K: keyName(key) }) });
}
