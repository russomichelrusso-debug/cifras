import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSong, songChords } from '../js/songs/parser.js';
import { parseChord } from '../js/theory/chords.js';
import { detectKey, rankKeys } from '../js/theory/keyDetect.js';
import { formatKey } from '../js/theory/transpose.js';

const ranking = (name) => {
  const text = readFileSync(new URL(`./fixtures/${name}.txt`, import.meta.url), 'utf8');
  return rankKeys(songChords(parseSong(text))).map((r) => r.name);
};
const detect = (list) => formatKey(detectKey(list.split(' ').map(parseChord)));

describe('detectKey: progressões simples', () => {
  it.each([
    ['C Am F G C', 'C'],
    ['G D Em C G', 'G'],
    ['Am Dm E7 Am', 'Am'], // V maior da menor harmônica
    ['Em C G D Em', 'Em'],
    ['D C G D', 'D'], // I bVII IV (mixolídio)
    ['F Bb C7 F', 'F'],
  ])('%s -> %s', (list, key) => {
    expect(detect(list)).toBe(key);
  });

  it('lista vazia', () => {
    expect(detectKey([])).toBeNull();
  });
});

// O "Tom:" dos sites nem sempre bate com os acordes escritos (afinação meio tom abaixo, capo),
// por isso o tom vem dos acordes e é confirmado na importação.
describe('detectKey: cifras reais', () => {
  it.each([
    ['little-wing', 'Em'],
    ['shine-on', 'Gm'],
    ['brain-damage', 'D'],
    ['fearless', 'G'], // I IV bIII
    ['folsom-prison-blues', 'E'], // site diz F: gravação meio tom acima
    ['wind-cries-mary', 'F'], // site diz C
    ['wont-get-fooled-again', 'A'], // I bVII IV
    ['walk-the-line', 'E'],
  ])('%s -> %s', (name, key) => {
    expect(ranking(name)[0]).toBe(key);
  });

  it.each([
    ['cats-in-the-cradle', 'E'],
    ['wish-you-were-here', 'Em'],
    ['wish-you-were-here', 'G'],
  ])('casos ambíguos: %s tem %s entre os 3 primeiros', (name, key) => {
    expect(ranking(name).slice(0, 3)).toContain(key);
  });
});
