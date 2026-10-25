import { describe, expect, it } from 'vitest';
import { matchRoute, setlistSongHash } from '../js/router.js';
import { addSongs, createSetlist, defaultSetlistName, duplicateSetlist, moveItem, neighbors, removeItem, removeSong, updateItem } from '../js/setlists/model.js';
import { formatKey, parseKey } from '../js/theory/transpose.js';

const song = (id, key = 'C', capo = 0) => ({ id, currentKey: parseKey(key), capo });
const ids = (setlist) => setlist.items.map((it) => it.songId);

describe('repertório', () => {
  it('nome padrão com a data', () => {
    expect(defaultSetlistName(new Date(2026, 10, 3))).toBe('Repertório 03/11');
    expect(createSetlist('  ', new Date(2026, 0, 9).getTime()).name).toBe('Repertório 09/01');
    expect(createSetlist('Culto domingo').name).toBe('Culto domingo');
  });

  it('adiciona com o tom e o capo atuais da música', () => {
    const s = addSongs(createSetlist('X'), [song('a', 'G', 2), song('b', 'Em')]);
    expect(ids(s)).toEqual(['a', 'b']);
    expect(formatKey(s.items[0].key)).toBe('G');
    expect(s.items[0].capo).toBe(2);
    expect(s.items[0].id).not.toBe(s.items[1].id);
  });

  it('a mesma música pode entrar duas vezes, com tons diferentes', () => {
    let s = addSongs(createSetlist('X'), [song('a'), song('a')]);
    s = updateItem(s, s.items[1].id, { key: parseKey('D') });
    expect(s.items.map((it) => formatKey(it.key))).toEqual(['C', 'D']);
  });

  it('muda tom e capo de um item sem tocar nos outros; capo fica entre 0 e 11', () => {
    let s = addSongs(createSetlist('X'), [song('a'), song('b')]);
    s = updateItem(s, s.items[0].id, { capo: 14 });
    expect(s.items.map((it) => it.capo)).toEqual([11, 0]);
  });

  it('move para cima e para baixo, sem sair dos limites', () => {
    const s = addSongs(createSetlist('X'), [song('a'), song('b'), song('c')]);
    const [a, , c] = s.items;
    expect(ids(moveItem(s, c.id, -1))).toEqual(['a', 'c', 'b']);
    expect(ids(moveItem(s, a.id, 1))).toEqual(['b', 'a', 'c']);
    expect(moveItem(s, a.id, -1)).toBe(s);
    expect(moveItem(s, c.id, 1)).toBe(s);
  });

  it('remove um item, ou todas as ocorrências de uma música', () => {
    const s = addSongs(createSetlist('X'), [song('a'), song('b'), song('a')]);
    expect(ids(removeItem(s, s.items[0].id))).toEqual(['b', 'a']);
    expect(ids(removeSong(s, 'a'))).toEqual(['b']);
  });

  it('duplicar copia os itens com ids novos', () => {
    const s = addSongs(createSetlist('Culto'), [song('a', 'D', 1)]);
    const copy = duplicateSetlist(s);
    expect(copy.name).toBe('Culto (cópia)');
    expect(copy.id).not.toBe(s.id);
    expect(copy.items[0]).toMatchObject({ songId: 'a', capo: 1 });
    expect(copy.items[0].id).not.toBe(s.items[0].id);
  });

  it('vizinhos para navegar entre as músicas', () => {
    const s = addSongs(createSetlist('X'), [song('a'), song('b'), song('c')]);
    const [a, b, c] = s.items;
    expect(neighbors(s, a.id)).toMatchObject({ index: 0, total: 3, prev: null, next: b });
    expect(neighbors(s, b.id)).toMatchObject({ index: 1, prev: a, next: c });
    expect(neighbors(s, c.id)).toMatchObject({ index: 2, prev: b, next: null });
  });

  it('rotas do repertório', () => {
    expect(matchRoute('#/repertorios')).toEqual({ name: 'setlists', params: [] });
    expect(matchRoute('#/repertorio/s1')).toEqual({ name: 'setlist', params: ['s1'] });
    expect(matchRoute(setlistSongHash('s1', 'i2'))).toEqual({ name: 'setlistSong', params: ['s1', 'i2'] });
  });
});
