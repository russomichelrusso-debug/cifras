import { get, getAll, put, remove, update } from './db.js';

export async function listSongs() {
  const songs = await getAll('songs');
  return songs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getSong = (id) => get('songs', id);

export async function saveSong(song) {
  const saved = { ...song, updatedAt: Date.now() };
  await put('songs', saved);
  return saved;
}

/** Muda só os campos de `patch`, relendo a música na mesma transação. */
export const updateSong = (id, patch) => update('songs', id, (song) => song && { ...song, ...patch, updatedAt: Date.now() });

export const deleteSong = (id) => remove('songs', id);
