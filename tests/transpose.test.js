import { describe, expect, it } from 'vitest';
import { formatBR, parseChord } from '../js/theory/chords.js';
import { formatKey, parseKey, spellInKey, transposeChord, transposeKey } from '../js/theory/transpose.js';

const key = (s) => parseKey(s);
const tr = (chord, n, target) => formatBR(transposeChord(parseChord(chord), n, key(target)));

describe('tom', () => {
  it('lê e formata', () => {
    expect(parseKey('Em')).toEqual({ tonic: 'E', mode: 'minor' });
    expect(parseKey('Bb')).toEqual({ tonic: 'Bb', mode: 'major' });
    expect(formatKey(parseKey('F#m'))).toBe('F#m');
    expect(parseKey('xyz')).toBeNull();
  });

  it('transpõe com a grafia padrão do tom', () => {
    expect(formatKey(transposeKey(key('C'), 1))).toBe('Db');
    expect(formatKey(transposeKey(key('C'), 6))).toBe('F#');
    expect(formatKey(transposeKey(key('C'), 10))).toBe('Bb');
    expect(formatKey(transposeKey(key('Am'), 4))).toBe('C#m');
    expect(formatKey(transposeKey(key('Am'), 6))).toBe('Ebm');
    expect(formatKey(transposeKey(key('Am'), -1))).toBe('G#m');
  });
});

describe('grafia pelo grau', () => {
  it('usa a armadura do tom', () => {
    expect(spellInKey(10, key('F'))).toBe('Bb');
    expect(spellInKey(6, key('G'))).toBe('F#');
    expect(spellInKey(1, key('Ab'))).toBe('Db');
  });

  it('acordes fora do campo seguem o grau', () => {
    expect(spellInKey(2, key('E'))).toBe('D'); // bVII em E é D, não C##
    expect(spellInKey(10, key('C'))).toBe('Bb'); // bVII em C
    expect(spellInKey(6, key('C'))).toBe('F#'); // #IV em C
    expect(spellInKey(8, key('Am'))).toBe('G#'); // vii° em Am (harmônica)
  });

  it('evita E#, B#, Cb e Fb', () => {
    expect(spellInKey(5, key('F#'))).toBe('F'); // VII de F# seria E#
    expect(spellInKey(11, key('Db'))).toBe('B'); // bVII de Db seria Cb
  });
});

describe('transposeChord', () => {
  it('mantém qualidade, tensões e baixo', () => {
    expect(tr('Am7(9)', 2, 'D')).toBe('Bm7(9)');
    expect(tr('D/F#', 2, 'A')).toBe('E/G#');
    expect(tr('C7M', 3, 'Eb')).toBe('Eb7M');
  });

  it('grafa pelo tom de destino', () => {
    // G C D em G -> F Bb C em F
    expect(['G', 'C', 'D'].map((c) => tr(c, -2, 'F'))).toEqual(['F', 'Bb', 'C']);
    // E A B7 em E -> F# B C#7 em F#
    expect(['E', 'A', 'B7'].map((c) => tr(c, 2, 'F#'))).toEqual(['F#', 'B', 'C#7']);
    // vii° de Ebm é D°
    expect(tr('D#°', -1, 'Ebm')).toBe('D°');
  });

  it('transpor ida e volta devolve o original', () => {
    for (const c of ['C', 'Am7(9)', 'F#m7(b5)', 'Bb/D', 'G7(#9)']) {
      const up = transposeChord(parseChord(c), 5, key('F'));
      expect(formatBR(transposeChord(up, -5, key('C')))).toBe(formatBR(parseChord(c)));
    }
  });
});
