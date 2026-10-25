import { describe, expect, it } from 'vitest';
import { matchRoute } from '../js/router.js';
import { createSong } from '../js/songs/model.js';
import { mergeRecords, validateBackup } from '../js/storage/backup.js';
import { parseChord } from '../js/theory/chords.js';
import { displayChord, viewKeys, writtenKey } from '../js/theory/notation.js';
import { formatKey, parseKey } from '../js/theory/transpose.js';
import { chordLineText, layoutChordLine, toWords } from '../js/views/render/layout.js';

const key = parseKey;

describe('viewKeys: tom, capo e formas', () => {
  const song = (o) => ({ originalKey: key('C'), currentKey: key('C'), capo: 0, sourceCapo: 0, ...o });

  it('sem capo e sem transposição: formas = acordes escritos', () => {
    expect(viewKeys(song())).toMatchObject({ shift: 0 });
    expect(formatKey(viewKeys(song()).shapes)).toBe('C');
  });

  it('transpor para D sobe 2 semitons', () => {
    const v = viewKeys(song({ currentKey: key('D') }));
    expect(v.shift).toBe(2);
    expect(formatKey(v.shapes)).toBe('D');
  });

  it('tom G com capo 2: formas de F', () => {
    const v = viewKeys(song({ currentKey: key('G'), capo: 2 }));
    expect(v.soundingShift).toBe(7); // de C (escrito) até G (o que soa)
    expect(formatKey(v.shapes)).toBe('F');
    expect(displayChord(parseChord('C'), { shift: v.shift, key: v.shapes })).toBe('F');
  });

  it('cifra escrita para capo 1 (I Walk the Line): soa em F, formas de E', () => {
    const s = createSong({ source: 'E\nI keep', title: 'I Walk The Line', writtenKey: key('E'), sourceCapo: 1 });
    expect(formatKey(s.originalKey)).toBe('F');
    expect(s.capo).toBe(1);
    expect(formatKey(writtenKey(s))).toBe('E');
    const v = viewKeys(s);
    expect(formatKey(v.shapes)).toBe('E');
    expect(displayChord(parseChord('B7'), { shift: v.shift, key: v.shapes })).toBe('B7');
    // tirando o capo, as formas sobem para F
    const sem = viewKeys({ ...s, capo: 0 });
    expect(displayChord(parseChord('B7'), { shift: sem.shift, key: sem.shapes })).toBe('C7');
  });
});

describe('displayChord', () => {
  it('regrafa pelo tom mesmo sem transpor', () => {
    expect(displayChord(parseChord('A#'), { shift: 0, key: key('F') })).toBe('Bb');
  });

  it('simplifica e troca a notação', () => {
    expect(displayChord(parseChord('Am7(9)'), { simplify: true })).toBe('Am');
    expect(displayChord(parseChord('C7M'), { notation: 'us' })).toBe('Cmaj7');
  });

  it('N.C.', () => {
    expect(displayChord(null)).toBe('N.C.');
  });
});

describe('layoutChordLine', () => {
  it('mantém as colunas quando cabe', () => {
    expect(layoutChordLine([{ text: 'C', col: 0 }, { text: 'G', col: 6 }]).map((i) => i.col)).toEqual([0, 6]);
  });

  it('empurra o acorde seguinte quando o anterior cresce (transposição)', () => {
    const items = layoutChordLine([{ text: 'C#m7(b5)', col: 0 }, { text: 'G', col: 4 }]);
    expect(items.map((i) => i.col)).toEqual([0, 9]);
    expect(chordLineText(items)).toBe('C#m7(b5) G');
  });

  it('respeita a coluna mínima depois do rótulo', () => {
    expect(layoutChordLine([{ text: 'Am', col: 2 }], 7)[0].col).toBe(7);
  });
});

describe('toWords (modo segmentos)', () => {
  const words = (segments) => toWords(segments).map((w) => w.pieces.map((p) => (p.chord ? `[${p.chord}]` : '') + p.text).join(''));

  it('acorde preso à sílaba no meio da palavra', () => {
    expect(words([{ chord: null, text: 'And the morals that they wor-' }, { chord: 'G', text: 'ship' }])).toEqual(['And', 'the', 'morals', 'that', 'they', 'wor-[G]ship']);
  });

  it('acorde sobre espaço fica sozinho', () => {
    expect(words([{ chord: 'A', text: 'We' }, { chord: 'G', text: '   with' }])).toEqual(['[A]We', '[G]', 'with']);
  });

  it('acorde depois do fim da letra', () => {
    expect(words([{ chord: 'E', text: 'me' }, { chord: 'E7', text: '' }])).toEqual(['[E]me', '[E7]']);
  });
});

describe('backup', () => {
  it('mescla por id: novo entra, mais recente vence, mais antigo é ignorado', () => {
    const existing = [{ id: 'a', updatedAt: 10 }, { id: 'b', updatedAt: 10 }];
    const incoming = [{ id: 'a', updatedAt: 20 }, { id: 'b', updatedAt: 5 }, { id: 'c', updatedAt: 1 }, { nope: true }];
    const r = mergeRecords(existing, incoming);
    expect(r.changed.map((x) => x.id)).toEqual(['a', 'c']);
    expect(r).toMatchObject({ added: 1, updated: 1 });
  });

  it('rejeita arquivo que não é backup do app', () => {
    expect(() => validateBackup({ foo: 1 })).toThrow(/não é um backup/);
    expect(() => validateBackup({ format: 'cifras-backup', version: 99, songs: [] })).toThrow(/versão mais nova/);
    expect(validateBackup({ format: 'cifras-backup', version: 1, songs: [] }).songs).toEqual([]);
  });
});

describe('createSong', () => {
  it('valida os campos obrigatórios', () => {
    expect(() => createSong({ source: ' ', title: 'X', writtenKey: key('C') })).toThrow(/vazia/);
    expect(() => createSong({ source: 'C', title: '', writtenKey: key('C') })).toThrow(/título/);
    expect(() => createSong({ source: 'C', title: 'X', writtenKey: null })).toThrow(/tom/);
  });

  it('limita o capo entre 0 e 11', () => {
    expect(createSong({ source: 'C', title: 'X', writtenKey: key('C'), sourceCapo: 15 }).capo).toBe(11);
    expect(createSong({ source: 'C', title: 'X', writtenKey: key('C'), sourceCapo: -2 }).capo).toBe(0);
  });
});

describe('rotas', () => {
  it.each([
    ['', 'library', []],
    ['#/', 'library', []],
    ['#/importar', 'importer', []],
    ['#/musica/abc', 'song', ['abc']],
    ['#/musica/abc/editar', 'editor', ['abc']],
    ['#/afinador', 'tuner', []],
    ['#/xyz', 'notFound', []],
  ])('%j', (hash, name, params) => {
    expect(matchRoute(hash)).toEqual({ name, params });
  });
});
