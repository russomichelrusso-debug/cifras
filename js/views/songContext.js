// Carrega a música aberta pela biblioteca ou por um repertório, com onde guardar tom e capo.
// Usado pela tela da música e pelo modo palco.

import { SETLISTS_HASH, setlistHash } from '../router.js';
import { neighbors, updateItem } from '../setlists/model.js';
import { getSetlist, updateSetlist } from '../storage/setlists.repo.js';
import { getSong, updateSong } from '../storage/songs.repo.js';

/** Direto da biblioteca: tom e capo ficam na música. */
export async function songContext(songId) {
  const song = await getSong(songId);
  if (!song) return { error: { text: 'Música não encontrada.', href: '#/', label: 'Voltar à biblioteca' } };
  return {
    song,
    state: { currentKey: song.currentKey, capo: song.capo },
    saveState: ({ currentKey, capo }) => updateSong(song.id, { currentKey, capo }),
  };
}

/** Dentro de um repertório: tom e capo ficam no item, sem mexer na música. */
export async function setlistContext(setlistId, itemId) {
  const setlist = await getSetlist(setlistId);
  const item = setlist?.items.find((it) => it.id === itemId);
  if (!item) return { error: { text: 'Item do repertório não encontrado.', href: SETLISTS_HASH, label: 'Voltar aos repertórios' } };
  const { index, total, prev, next } = neighbors(setlist, itemId);
  const titleOf = async (it) => it && { ...it, title: (await getSong(it.songId))?.title ?? 'Música excluída' };
  const [song, prevItem, nextItem] = await Promise.all([getSong(item.songId), titleOf(prev), titleOf(next)]);
  if (!song) return { error: { text: 'Esta música foi excluída da biblioteca.', href: setlistHash(setlist.id), label: 'Voltar ao repertório' } };
  return {
    song,
    setlist,
    prev: prevItem,
    next: nextItem,
    subtitle: `${setlist.name} · ${index + 1} de ${total}`,
    state: { currentKey: item.key, capo: item.capo },
    saveState: ({ currentKey, capo }) => updateSetlist(setlist.id, (s) => updateItem(s, itemId, { key: currentKey, capo })),
  };
}
