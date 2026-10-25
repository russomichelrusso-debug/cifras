// Biblioteca: lista, busca e backup.

import { songHash } from '../router.js';
import { downloadBackup, importBackup } from '../storage/backup.js';
import { listSongs } from '../storage/songs.repo.js';
import { formatKey } from '../theory/transpose.js';
import { h, icon, toast } from '../ui/dom.js';

const normalize = (s) => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export async function renderLibrary(container) {
  const songs = await listSongs();
  const list = h('ul', { class: 'song-list' });
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar por título ou artista', 'aria-label': 'Buscar', oninput: () => fill() });

  function fill() {
    const q = normalize(search.value);
    const found = songs.filter((s) => normalize(`${s.title} ${s.artist}`).includes(q));
    list.replaceChildren(
      ...found.map((s) =>
        h(
          'li',
          {},
          h(
            'a',
            { class: 'song-item', href: songHash(s.id) },
            h('span', { class: 'song-item-text' }, h('span', { class: 'song-item-title' }, s.title), s.artist ? h('span', { class: 'song-item-artist' }, s.artist) : null),
            h('span', { class: 'chip' }, formatKey(s.currentKey), s.capo ? ` · capo ${s.capo}` : ''),
          ),
        ),
      ),
    );
    if (!found.length && songs.length) list.append(h('li', { class: 'empty' }, 'Nenhuma música encontrada.'));
  }

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const { added, updated } = await importBackup(await file.text());
        toast(`Backup importado: ${added} novas, ${updated} atualizadas.`);
        renderLibrary(container);
      } catch (err) {
        toast(err.message, { error: true });
      }
    },
  });

  const exportButton = h('button', {
    class: 'button',
    type: 'button',
    onclick: async () => toast(`Backup salvo com ${await downloadBackup()} músicas.`),
  }, icon('download'), 'Exportar backup');
  const importButton = h('button', { class: 'button', type: 'button', onclick: () => fileInput.click() }, icon('upload'), 'Importar backup');

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-header' }, h('h1', {}, 'Biblioteca'), h('a', { class: 'button button-primary', href: '#/importar' }, icon('plus'), 'Importar cifra')),
      songs.length
        ? [h('div', { class: 'search' }, icon('search'), search), list]
        : h(
            'div',
            { class: 'empty-state' },
            h('p', {}, 'Nenhuma música ainda.'),
            h('p', { class: 'muted' }, 'Cole uma cifra copiada de um site, ou abra um arquivo .txt.'),
            h('a', { class: 'button button-primary', href: '#/importar' }, 'Importar a primeira cifra'),
          ),
      h('footer', { class: 'page-footer' }, h('p', { class: 'muted' }, 'Suas músicas ficam só neste aparelho. Exporte um backup de vez em quando.'), h('div', { class: 'row' }, exportButton, importButton, fileInput)),
    ),
  );
  fill();
}
