// Criação e validação de registros salvos.

import { parseKey, transposeKey } from '../theory/transpose.js';

export const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const validKey = (key) => key && parseKey(key.tonic) && (key.mode === 'major' || key.mode === 'minor');

/**
 * writtenKey: tom dos acordes como estão escritos no texto.
 * sourceCapo: capo indicado na cifra ("CAPO 1"). A música soa em writtenKey + sourceCapo.
 */
export function createSong({ source, title, artist = null, writtenKey, sourceCapo = 0, bpm = null }, now = Date.now()) {
  if (!source || !source.trim()) throw new Error('A cifra está vazia.');
  if (!title || !title.trim()) throw new Error('Informe o título.');
  if (!validKey(writtenKey)) throw new Error('Informe o tom.');
  const capo = clampCapo(sourceCapo);
  const originalKey = transposeKey(writtenKey, capo);
  return {
    id: newId(),
    title: title.trim(),
    artist: artist?.trim() || null,
    source,
    originalKey,
    currentKey: originalKey,
    capo,
    sourceCapo: capo,
    bpm,
    scrollSpeed: null,
    createdAt: now,
    updatedAt: now,
  };
}

export const clampCapo = (n) => Math.min(11, Math.max(0, Number(n) || 0));
