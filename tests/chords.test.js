import { describe, expect, it } from 'vitest';
import { formatBR, formatUS, parseChord, simplifyChord } from '../js/theory/chords.js';
import { latinName, parseNote } from '../js/theory/notes.js';

const br = (s) => formatBR(parseChord(s));

describe('notas', () => {
  it('lê sustenido, bemol e símbolos', () => {
    expect(parseNote('F#').pc).toBe(6);
    expect(parseNote('Bb').pc).toBe(10);
    expect(parseNote('E♭').pc).toBe(3);
    expect(parseNote('H')).toBeNull();
  });

  it('converte para nome latino', () => {
    expect(latinName('F')).toBe('Fá');
    expect(latinName('Bb')).toBe('Sib');
    expect(latinName('C#')).toBe('Dó#');
  });
});

describe('parseChord', () => {
  it.each([
    ['C', { root: 'C', triad: 'maj', seventh: null, tensions: [], bass: null }],
    ['Am', { root: 'A', triad: 'min' }],
    ['Bbm', { root: 'Bb', triad: 'min' }],
    ['G7', { triad: 'maj', seventh: '7' }],
    ['C7M', { seventh: 'maj7' }],
    ['Cmaj7', { seventh: 'maj7' }],
    ['C7+', { seventh: 'maj7' }],
    ['Bbmaj7', { root: 'Bb', seventh: 'maj7' }],
    ['Am7(9)', { triad: 'min', seventh: '7', tensions: ['9'] }],
    ['Bm7(b5)', { triad: 'dim', seventh: '7' }],
    ['Bm7b5', { triad: 'dim', seventh: '7' }],
    ['Bø', { triad: 'dim', seventh: '7' }],
    ['Eb°', { root: 'Eb', triad: 'dim', seventh: null }],
    ['E°7', { triad: 'dim', seventh: 'dim7' }],
    ['F#°7', { root: 'F#', triad: 'dim', seventh: 'dim7' }],
    ['Cdim7', { triad: 'dim', seventh: 'dim7' }],
    ['C+', { triad: 'aug' }],
    ['G4', { triad: 'sus4' }],
    ['Dsus2', { triad: 'sus2' }],
    ['D7(9+)', { seventh: '7', tensions: ['#9'] }],
    ['E7(#9)', { seventh: '7', tensions: ['#9'] }],
    ['F(add9)', { seventh: null, tensions: ['9'] }],
    ['C9', { seventh: null, tensions: ['9'] }], // convenção BR: C9 = Cadd9
    ['C7(9)', { seventh: '7', tensions: ['9'] }],
    ['C6', { seventh: '6' }],
    ['Gm6', { triad: 'min', seventh: '6' }],
    ['C6(9)', { seventh: '6', tensions: ['9'] }],
    ['E5', { triad: '5' }],
    ['D/F#', { root: 'D', bass: 'F#' }],
    ['D9/F#', { root: 'D', tensions: ['9'], bass: 'F#' }],
    ['Bm7/F#', { triad: 'min', seventh: '7', bass: 'F#' }],
    ['G7/D', { seventh: '7', bass: 'D' }],
    ['Eb/Bb', { root: 'Eb', bass: 'Bb' }],
  ])('%s', (input, expected) => {
    expect(parseChord(input)).toMatchObject(expected);
  });

  it.each(['', 'H', 'Cx', 'the', 'And', 'A------', 'C55', 'Hah!', '(2x)'])('rejeita %j', (input) => {
    expect(parseChord(input)).toBeNull();
  });
});

describe('formatação', () => {
  it.each([
    ['Cmaj7', 'C7M'],
    ['Am7(9)', 'Am7(9)'],
    ['Gsus4', 'G4'],
    ['G7sus4', 'G7(4)'],
    ['Bm7b5', 'Bm7(b5)'],
    ['Cdim', 'C°'],
    ['Cdim7', 'C°7'],
    ['Caug', 'C+'],
    ['F(add9)', 'F(9)'],
    ['D7(9+)', 'D7(#9)'],
    ['D/F#', 'D/F#'],
  ])('BR: %s -> %s', (input, out) => {
    expect(br(input)).toBe(out);
  });

  it.each([
    ['C7M', 'Cmaj7'],
    ['G4', 'Gsus4'],
    ['Bm7(b5)', 'Bm7b5'],
    ['F(9)', 'Fadd9'],
  ])('EUA: %s -> %s', (input, out) => {
    expect(formatUS(parseChord(input))).toBe(out);
  });

  it('formatar e reler dá o mesmo acorde', () => {
    for (const s of ['C7M', 'Am7(9)', 'G4', 'Bm7(b5)', 'C°7', 'C+', 'F(9)', 'D7(#9)', 'D/F#', 'Gm6', 'E5']) {
      expect(parseChord(br(s))).toEqual(parseChord(s));
    }
  });
});

describe('simplificar', () => {
  it.each([
    ['Am7(9)', 'Am'],
    ['C7M', 'C'],
    ['G4', 'G'],
    ['D/F#', 'D'],
    ['Bm7(b5)', 'B°'],
    ['E7(#9)', 'E'],
  ])('%s -> %s', (input, out) => {
    expect(formatBR(simplifyChord(parseChord(input)))).toBe(out);
  });
});
