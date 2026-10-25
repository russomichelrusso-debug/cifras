import { describe, expect, it } from 'vitest';
import { formatBR, parseChord } from '../js/theory/chords.js';
import { analyzeChord, harmonicField, keyName } from '../js/theory/harmony.js';
import { parseKey } from '../js/theory/transpose.js';

const an = (chord, key) => analyzeChord(parseChord(chord), parseKey(key));
const names = (list) => list.map((x) => formatBR(x.chord));

describe('campo harmônico', () => {
  it('C maior', () => {
    const field = harmonicField(parseKey('C'));
    expect(names(field.main)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
    expect(field.main.map((x) => x.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(field.main.map((x) => x.function)).toEqual(['tonic', 'subdominant', 'tonic', 'subdominant', 'dominant', 'tonic', 'dominant']);
    expect(field.extra).toEqual([]);
  });

  it('A menor: natural, mais os acordes da harmônica e da melódica', () => {
    const field = harmonicField(parseKey('Am'));
    expect(names(field.main)).toEqual(['Am', 'B°', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(field.main.map((x) => x.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
    expect(field.extra.map((x) => [formatBR(x.chord), x.roman, x.source])).toEqual([
      ['E', 'V', 'harmonic'],
      ['G#°', 'vii°', 'harmonic'],
      ['D', 'IV', 'melodic'],
      ['Bm', 'ii', 'melodic'],
    ]);
  });

  it('grafia pelo tom: Bb maior usa bemóis', () => {
    expect(names(harmonicField(parseKey('Bb')).main)).toEqual(['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'A°']);
  });

  it('nome do tom em português', () => {
    expect(keyName(parseKey('C'))).toBe('C maior');
    expect(keyName(parseKey('F#m'))).toBe('F# menor');
  });
});

describe('analyzeChord: exemplo da referência (F em C maior)', () => {
  const a = an('F', 'C');

  it('grau, função e tipo', () => {
    expect(a).toMatchObject({ kind: 'diatonic', roman: 'IV', degree: 4, function: 'subdominant', quality: 'Tríade maior' });
  });

  it('notas e intervalos', () => {
    expect(a.notes.map((n) => [n.name, n.latin, n.interval])).toEqual([
      ['F', 'Fá', 'Fundamental'],
      ['A', 'Lá', 'Terça maior'],
      ['C', 'Dó', 'Quinta justa'],
    ]);
  });

  it('caráter: maior, movimento e preparação, estabilidade e tensão médias', () => {
    expect(a.character).toEqual({ label: 'Maior', tags: ['Movimento', 'Preparação'], stability: 3, tension: 3 });
  });

  it('substituições: relativo e antirrelativo, com grau', () => {
    expect(a.substitutions.map((s) => [formatBR(s.chord), s.roman, s.label])).toEqual([
      ['Dm', 'ii', 'Relativo'],
      ['Am', 'vi', 'Antirrelativo'],
    ]);
  });

  it('dica rápida', () => {
    expect(a.tip).toBe('F cria movimento e prepara a chegada da tensão.');
  });
});

describe('analyzeChord: graus e sétimas', () => {
  it.each([
    ['C', 'C', 'I', 'tonic'],
    ['Dm7', 'C', 'ii7', 'subdominant'],
    ['Em', 'C', 'iii', 'tonic'],
    ['G7', 'C', 'V7', 'dominant'],
    ['Am7', 'C', 'vi7', 'tonic'],
    ['C7M', 'C', 'I7M', 'tonic'],
    ['Bm7(b5)', 'C', 'viiø', 'dominant'],
    ['B°', 'C', 'vii°', 'dominant'],
    ['G4', 'C', 'V', 'dominant'],
    ['Am', 'Am', 'i', 'tonic'],
    ['C', 'Am', 'III', 'tonic'],
    ['Dm', 'Am', 'iv', 'subdominant'],
    ['G', 'Am', 'VII', 'dominant'],
  ])('%s em %s = %s', (chord, key, roman, fn) => {
    expect(an(chord, key)).toMatchObject({ kind: 'diatonic', roman, function: fn });
  });

  it('menor harmônica e melódica', () => {
    expect(an('E7', 'Am')).toMatchObject({ kind: 'harmonic', roman: 'V7', function: 'dominant' });
    expect(an('G#°', 'Am')).toMatchObject({ kind: 'harmonic', roman: 'vii°', function: 'dominant' });
    expect(an('D', 'Am')).toMatchObject({ kind: 'melodic', roman: 'IV', function: 'subdominant' });
  });
});

describe('analyzeChord: fora do campo', () => {
  it('dominante secundária: A7 em C = V7/ii, aponta para Dm', () => {
    const a = an('A7', 'C');
    expect(a).toMatchObject({ kind: 'secondaryDominant', roman: 'V7/ii', function: 'dominant' });
    expect(formatBR(a.target.chord)).toBe('Dm');
    expect(a.tip).toBe('A7 aponta para Dm: resolva nele.');
  });

  it('C7 em C não é tônica: é V7/IV', () => {
    expect(an('C7', 'C')).toMatchObject({ kind: 'secondaryDominant', roman: 'V7/IV' });
  });

  it('E em C (sem sétima) = V/vi', () => {
    expect(an('E', 'C')).toMatchObject({ kind: 'secondaryDominant', roman: 'V/vi' });
  });

  it('empréstimo modal: Bb em C = bVII, Fm em C = iv, Ab em C = bVI', () => {
    expect(an('Bb', 'C')).toMatchObject({ kind: 'borrowed', roman: 'bVII', function: 'subdominant', borrowedFrom: 'C menor' });
    expect(an('Fm', 'C')).toMatchObject({ kind: 'borrowed', roman: 'iv', function: 'subdominant' });
    expect(an('Ab', 'C')).toMatchObject({ kind: 'borrowed', roman: 'bVI' });
    expect(an('Bb', 'C').tip).toBe('Bb vem de C menor e muda a cor da música.');
  });

  it('empréstimo do maior em tom menor: A em Am = I (picarda)', () => {
    expect(an('A', 'Am')).toMatchObject({ kind: 'borrowed', roman: 'I', borrowedFrom: 'A maior' });
  });

  it('cromático: Db em C = bII', () => {
    const a = an('Db', 'C');
    expect(a).toMatchObject({ kind: 'chromatic', roman: 'bII', function: null });
    expect(a.tip).toBe('Db não pertence a C maior: confira se a música mudou de tom.');
  });
});

describe('analyzeChord: substituições de dominante', () => {
  it('G7 em C: relativo Em, trítono Db7 e vii° B°', () => {
    const subs = an('G7', 'C').substitutions.map((s) => [formatBR(s.chord), s.roman, s.label]);
    expect(subs).toEqual([
      ['Em', 'iii', 'Relativo'],
      ['Db7', '', 'Substituto trítono'],
      ['B°', 'vii°', 'Sétimo grau'],
    ]);
  });

  it('dominante secundária: trítono e sétimo grau grafados pelo intervalo', () => {
    expect(an('A7', 'C').substitutions.map((s) => formatBR(s.chord))).toEqual(['Eb7', 'C#°']);
  });
});

describe('analyzeChord: notas', () => {
  it('Am7(9): sétima menor e nona maior', () => {
    expect(an('Am7(9)', 'C').notes.map((n) => [n.name, n.interval])).toEqual([
      ['A', 'Fundamental'],
      ['C', 'Terça menor'],
      ['E', 'Quinta justa'],
      ['G', 'Sétima menor'],
      ['B', 'Nona maior'],
    ]);
  });

  it('C°7: grafia pelo intervalo (Bbb), não pela tecla', () => {
    expect(an('C°7', 'C').notes.map((n) => n.name)).toEqual(['C', 'Eb', 'Gb', 'Bbb']);
  });

  it('D4: quarta justa no lugar da terça', () => {
    expect(an('D4', 'G').notes.map((n) => n.interval)).toEqual(['Fundamental', 'Quarta justa', 'Quinta justa']);
  });

  it.each([
    ['Am', 'Tríade menor'],
    ['B°', 'Tríade diminuta'],
    ['C+', 'Tríade aumentada'],
    ['G7', 'Tétrade com sétima'],
    ['C7M', 'Tétrade com sétima maior'],
    ['Am7', 'Tétrade menor com sétima'],
    ['Bm7(b5)', 'Meio-diminuto'],
    ['C°7', 'Diminuto com sétima'],
    ['G4', 'Suspenso (4ª)'],
    ['C(9)', 'Tríade maior com nona'],
    ['Am7(9)', 'Tétrade menor com sétima e nona'],
  ])('%s = %s', (chord, quality) => {
    expect(an(chord, 'C').quality).toBe(quality);
  });
});

describe('analyzeChord: baixo', () => {
  it.each([
    ['C/E', '1ª inversão (terça no baixo)'],
    ['C/G', '2ª inversão (quinta no baixo)'],
    ['G7/F', '3ª inversão (sétima no baixo)'],
    ['D/C', 'Baixo fora do acorde (pedal ou passagem)'],
  ])('%s', (chord, label) => {
    expect(an(chord, 'C').inversion).toEqual({ bass: chord.split('/')[1], label });
  });

  it('o grau vem do acorde, não do baixo: C/E em C = I', () => {
    expect(an('C/E', 'C').roman).toBe('I');
  });
});
