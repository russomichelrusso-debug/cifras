// Backup da biblioteca em JSON: exportar e importar mesclando por id.

import { get, getAll, put, putMany } from './db.js';

export const BACKUP_FORMAT = 'cifras-backup';
export const BACKUP_VERSION = 1;

/** Mescla por id: o registro com updatedAt mais recente vence. Função pura. */
export function mergeRecords(existing, incoming) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const changed = [];
  let added = 0;
  let updated = 0;
  for (const r of incoming) {
    if (!r || typeof r.id !== 'string') continue;
    const current = byId.get(r.id);
    if (!current) added += 1;
    else if ((r.updatedAt ?? 0) > (current.updatedAt ?? 0)) updated += 1;
    else continue;
    changed.push(r);
  }
  return { changed, added, updated };
}

export function validateBackup(data) {
  if (!data || data.format !== BACKUP_FORMAT) throw new Error('Este arquivo não é um backup do app de cifras.');
  if (data.version > BACKUP_VERSION) throw new Error('Backup de uma versão mais nova do app. Atualize o app antes de importar.');
  if (!Array.isArray(data.songs)) throw new Error('Backup sem a lista de músicas.');
  return data;
}

export async function buildBackup(now = new Date()) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    songs: await getAll('songs'),
    setlists: await getAll('setlists'),
    settings: (await get('settings', 'app')) ?? null,
  };
}

export async function downloadBackup() {
  const data = await buildBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `cifras-backup-${data.exportedAt.slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return data.songs.length;
}

/** Importa um backup. As configurações só são restauradas se ainda não existirem. */
export async function importBackup(text) {
  const data = validateBackup(JSON.parse(text));
  const songs = mergeRecords(await getAll('songs'), data.songs);
  const setlists = mergeRecords(await getAll('setlists'), data.setlists ?? []);
  if (songs.changed.length) await putMany('songs', songs.changed);
  if (setlists.changed.length) await putMany('setlists', setlists.changed);
  if (data.settings && !(await get('settings', 'app'))) await put('settings', data.settings, 'app');
  return { added: songs.added, updated: songs.updated };
}
