// Repertórios: lista ordenada de músicas, cada uma com tom e capo próprios para aquele dia.
// Funções puras; quem salva é o setlists.repo.js.
//
// { id, name, items: [{ id, songId, key, capo }], createdAt, updatedAt }
// `key` é o tom que soa (como currentKey da música). O mesmo songId pode aparecer mais de uma vez.

import { clampCapo, newId } from '../songs/model.js';

export function defaultSetlistName(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `Repertório ${dd}/${mm}`;
}

export function createSetlist(name, now = Date.now()) {
  return { id: newId(), name: name?.trim() || defaultSetlistName(new Date(now)), items: [], createdAt: now, updatedAt: now };
}

const withItems = (setlist, items) => ({ ...setlist, items });

/** Adiciona no fim, com o tom e o capo atuais de cada música. */
export function addSongs(setlist, songs) {
  return withItems(setlist, [...setlist.items, ...songs.map((s) => ({ id: newId(), songId: s.id, key: s.currentKey, capo: s.capo ?? 0 }))]);
}

export const removeItem = (setlist, itemId) => withItems(setlist, setlist.items.filter((it) => it.id !== itemId));

/** Remove todas as ocorrências de uma música (quando ela é excluída da biblioteca). */
export const removeSong = (setlist, songId) => withItems(setlist, setlist.items.filter((it) => it.songId !== songId));

export function updateItem(setlist, itemId, patch) {
  const fixed = 'capo' in patch ? { ...patch, capo: clampCapo(patch.capo) } : patch;
  return withItems(setlist, setlist.items.map((it) => (it.id === itemId ? { ...it, ...fixed } : it)));
}

/** Move o item `delta` posições (-1 sobe, +1 desce). Fora dos limites, não muda nada. */
export function moveItem(setlist, itemId, delta) {
  const from = setlist.items.findIndex((it) => it.id === itemId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= setlist.items.length) return setlist;
  const items = [...setlist.items];
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  return withItems(setlist, items);
}

export function duplicateSetlist(setlist, now = Date.now()) {
  return {
    ...createSetlist(`${setlist.name} (cópia)`, now),
    items: setlist.items.map((it) => ({ ...it, id: newId() })),
  };
}

/** Posição do item e vizinhos, para navegar entre as músicas. */
export function neighbors(setlist, itemId) {
  const index = setlist.items.findIndex((it) => it.id === itemId);
  return {
    index,
    total: setlist.items.length,
    prev: index > 0 ? setlist.items[index - 1] : null,
    next: index >= 0 && index < setlist.items.length - 1 ? setlist.items[index + 1] : null,
  };
}
