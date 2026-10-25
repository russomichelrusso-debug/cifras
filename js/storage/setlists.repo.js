import { removeSong } from '../setlists/model.js';
import { get, getAll, put, putMany, remove, update } from './db.js';

export async function listSetlists() {
  const setlists = await getAll('setlists');
  return setlists.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getSetlist = (id) => get('setlists', id);

export async function saveSetlist(setlist) {
  const saved = { ...setlist, updatedAt: Date.now() };
  await put('setlists', saved);
  return saved;
}

/** Aplica `fn` ao repertório relido na mesma transação. */
export const updateSetlist = (id, fn) => update('setlists', id, (setlist) => setlist && { ...fn(setlist), updatedAt: Date.now() });

export const deleteSetlist = (id) => remove('setlists', id);

/** Tira a música de todos os repertórios. Retorna quantos repertórios mudaram. */
export async function removeSongFromSetlists(songId) {
  const changed = (await getAll('setlists'))
    .filter((s) => s.items.some((it) => it.songId === songId))
    .map((s) => ({ ...removeSong(s, songId), updatedAt: Date.now() }));
  if (changed.length) await putMany('setlists', changed);
  return changed.length;
}
