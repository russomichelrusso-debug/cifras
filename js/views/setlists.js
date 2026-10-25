// Repertórios: lista e edição (nome, ordem, tom e capo de cada música).

import { SETLISTS_HASH, navigate, setlistHash, setlistSongHash, setlistStageHash } from '../router.js';
import { addSongs, createSetlist, duplicateSetlist, moveItem, removeItem, updateItem } from '../setlists/model.js';
import { songSearch } from '../songs/search.js';
import { deleteSetlist, getSetlist, listSetlists, saveSetlist } from '../storage/setlists.repo.js';
import { listSongs } from '../storage/songs.repo.js';
import { formatKey, transposeKey } from '../theory/transpose.js';
import { openDialog } from '../ui/dialog.js';
import { notFoundPage } from '../ui/controls.js';
import { h, icon, toast } from '../ui/dom.js';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

async function newSetlist() {
  const setlist = await saveSetlist(createSetlist());
  navigate(setlistHash(setlist.id));
}

export async function renderSetlists(container) {
  const setlists = await listSetlists();
  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      h('header', { class: 'page-header' }, h('h1', {}, 'Repertórios'), h('button', { class: 'button button-primary', type: 'button', onclick: newSetlist }, icon('plus'), 'Novo repertório')),
      setlists.length
        ? h(
            'ul',
            { class: 'song-list' },
            setlists.map((s) =>
              h(
                'li',
                {},
                h(
                  'a',
                  { class: 'song-item', href: setlistHash(s.id) },
                  h('span', { class: 'song-item-text' }, h('span', { class: 'song-item-title' }, s.name), h('span', { class: 'song-item-artist' }, `${s.items.length} ${s.items.length === 1 ? 'música' : 'músicas'}`)),
                  h('span', { class: 'muted small' }, dateFormat.format(s.updatedAt)),
                ),
              ),
            ),
          )
        : h(
            'div',
            { class: 'empty-state' },
            h('p', {}, 'Nenhum repertório ainda.'),
            h('p', { class: 'muted' }, 'Monte a lista de um culto ou show, com o tom e o capo de cada música para aquele dia. A música na biblioteca não muda.'),
            h('button', { class: 'button button-primary', type: 'button', onclick: newSetlist }, 'Criar o primeiro repertório'),
          ),
    ),
  );
}

export async function renderSetlist(container, [id]) {
  let setlist = await getSetlist(id);
  if (!setlist) return notFoundPage(container, 'Repertório não encontrado.', SETLISTS_HASH, 'Voltar aos repertórios');
  const songs = new Map((await listSongs()).map((s) => [s.id, s]));
  const list = h('ol', { class: 'setlist-items' });
  const startButton = h('a', { class: 'button button-primary' }, icon('play'), 'Começar');
  const stageButton = h('a', { class: 'button' }, icon('stage'), 'Modo palco');

  // Atualiza a tela na hora e grava em fila: um salvamento antigo que termine depois
  // nunca sobrescreve uma mudança mais nova.
  let saving = Promise.resolve();
  function commit(next, { redraw = true } = {}) {
    setlist = next;
    if (redraw) draw();
    saving = saving.then(() => saveSetlist(setlist)).catch((err) => toast(`Não foi possível salvar: ${err.message}`, { error: true }));
    return saving;
  }

  const name = h('input', {
    class: 'input setlist-name',
    value: setlist.name,
    'aria-label': 'Nome do repertório',
    onchange: () => commit({ ...setlist, name: name.value.trim() || setlist.name }, { redraw: false }),
  });

  function itemRow(item, index) {
    const song = songs.get(item.songId);
    const capoText = item.capo ? ` · capo ${item.capo}` : '';
    const move = (delta, label, iconName, disabled) =>
      h('button', { class: 'icon-button', type: 'button', 'aria-label': label, disabled, onclick: () => commit(moveItem(setlist, item.id, delta)) }, icon(iconName));
    const removeButton = h('button', { class: 'icon-button', type: 'button', 'aria-label': `Tirar ${song?.title ?? 'música'} do repertório`, onclick: () => commit(removeItem(setlist, item.id)) }, icon('close'));

    if (!song) {
      return h('li', { class: 'setlist-item is-missing' }, h('span', { class: 'setlist-pos' }, index + 1), h('span', { class: 'setlist-title muted' }, 'Música excluída da biblioteca'), removeButton);
    }
    const setKey = (delta) => commit(updateItem(setlist, item.id, { key: transposeKey(item.key, delta) }));
    const setCapo = (delta) => commit(updateItem(setlist, item.id, { capo: item.capo + delta }));
    return h(
      'li',
      { class: 'setlist-item' },
      h('span', { class: 'setlist-pos', 'aria-hidden': 'true' }, index + 1),
      h(
        'a',
        { class: 'setlist-title', href: setlistSongHash(setlist.id, item.id) },
        h('span', { class: 'song-item-title' }, song.title),
        h('span', { class: 'song-item-artist' }, [song.artist, `Tom ${formatKey(item.key)}${capoText}`].filter(Boolean).join(' · ')),
      ),
      h(
        'div',
        { class: 'setlist-item-controls' },
        h('div', { class: 'stepper stepper-compact', role: 'group', 'aria-label': `Tom de ${song.title}` },
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Meio tom abaixo', onclick: () => setKey(-1) }, icon('minus')),
          h('span', { class: 'stepper-value' }, formatKey(item.key)),
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Meio tom acima', onclick: () => setKey(1) }, icon('plus'))),
        h('div', { class: 'stepper stepper-compact', role: 'group', 'aria-label': `Capo de ${song.title}` },
          h('span', { class: 'stepper-label' }, 'Capo'),
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Diminuir capo', onclick: () => setCapo(-1) }, icon('minus')),
          h('span', { class: 'stepper-value' }, item.capo),
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Aumentar capo', onclick: () => setCapo(1) }, icon('plus'))),
        h('div', { class: 'setlist-move' }, move(-1, 'Subir', 'up', index === 0), move(1, 'Descer', 'down', index === setlist.items.length - 1)),
        removeButton,
      ),
    );
  }

  function draw() {
    list.replaceChildren(...setlist.items.map(itemRow));
    if (!setlist.items.length) list.append(h('li', { class: 'empty' }, 'Nenhuma música ainda. Adicione da biblioteca.'));
    startButton.hidden = !setlist.items.length;
    stageButton.hidden = !setlist.items.length;
    if (setlist.items.length) {
      startButton.href = setlistSongHash(setlist.id, setlist.items[0].id);
      stageButton.href = setlistStageHash(setlist.id, setlist.items[0].id);
    }
  }

  function pickSongs() {
    const all = [...songs.values()].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    if (!all.length) {
      toast('A biblioteca está vazia. Importe uma cifra primeiro.', { error: true });
      return;
    }
    const find = songSearch(all);
    const results = h('ul', { class: 'picker-list' });
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Buscar na biblioteca', 'aria-label': 'Buscar na biblioteca', oninput: () => fill() });
    const counts = () => new Map(setlist.items.reduce((m, it) => m.set(it.songId, (m.get(it.songId) ?? 0) + 1), new Map()));
    function fill() {
      const inList = counts();
      results.replaceChildren(
        ...find(search.value)
          .map((s) =>
            h(
              'li',
              {},
              h(
                'button',
                { class: 'list-button', type: 'button', onclick: () => {
                  commit(addSongs(setlist, [s]));
                  fill();
                } },
                h('span', { class: 'song-item-text' }, h('span', { class: 'song-item-title' }, s.title), s.artist ? h('span', { class: 'song-item-artist' }, s.artist) : null),
                inList.get(s.id) ? h('span', { class: 'chip' }, inList.get(s.id) > 1 ? `✓ ${inList.get(s.id)}×` : '✓ na lista') : h('span', { class: 'chip chip-outline' }, icon('plus'), 'Adicionar'),
              ),
            ),
          ),
      );
    }
    openDialog({ title: 'Adicionar músicas', content: [search, results] });
    fill();
    search.focus();
  }

  async function duplicate() {
    await saving;
    const copy = await saveSetlist(duplicateSetlist(setlist));
    toast('Repertório duplicado.');
    navigate(setlistHash(copy.id));
  }

  async function remove() {
    if (!window.confirm(`Excluir o repertório "${setlist.name}"? As músicas continuam na biblioteca.`)) return;
    await deleteSetlist(setlist.id);
    toast('Repertório excluído.');
    navigate(SETLISTS_HASH);
  }

  container.replaceChildren(
    h(
      'div',
      { class: 'page page-setlist' },
      h(
        'header',
        { class: 'page-header' },
        h('a', { class: 'icon-button', href: SETLISTS_HASH, 'aria-label': 'Voltar aos repertórios' }, icon('back')),
        name,
        h(
          'details',
          { class: 'menu' },
          h('summary', { class: 'icon-button', 'aria-label': 'Mais opções' }, icon('more')),
          h(
            'div',
            { class: 'menu-panel' },
            h('button', { class: 'menu-row menu-link', type: 'button', onclick: duplicate }, icon('copy'), 'Duplicar repertório'),
            h('button', { class: 'menu-row menu-link danger', type: 'button', onclick: remove }, icon('trash'), 'Excluir repertório'),
          ),
        ),
      ),
      h('p', { class: 'muted small setlist-hint' }, 'O tom e o capo valem só para este repertório. A música na biblioteca não muda.'),
      h('div', { class: 'row setlist-actions' }, startButton, stageButton, h('button', { class: 'button', type: 'button', onclick: pickSongs }, icon('plus'), 'Adicionar músicas')),
      list,
    ),
  );
  draw();
}
