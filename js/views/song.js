// Tela da música: cifra, transposição, capo, tamanho da fonte, simplificar e modo de exibição.
// Usada direto da biblioteca (tom e capo salvos na música) e dentro de um repertório
// (tom e capo salvos no item do repertório, sem mexer na música).

import { navigate, setlistSongHash } from '../router.js';
import { addSongs, createSetlist, neighbors, updateItem } from '../setlists/model.js';
import { clampCapo } from '../songs/model.js';
import { parseSong } from '../songs/parser.js';
import { getSetlist, listSetlists, removeSongFromSetlists, saveSetlist } from '../storage/setlists.repo.js';
import { deleteSong, getSong, saveSong } from '../storage/songs.repo.js';
import { getSettingsState, updateSettings } from '../store.js';
import { viewKeys } from '../theory/notation.js';
import { formatKey, intervalBetween, transposeKey } from '../theory/transpose.js';
import { openDialog } from '../ui/dialog.js';
import { h, icon, toast } from '../ui/dom.js';
import { mountSongBody } from './songBody.js';

const LAYOUTS = [
  ['auto', 'Automático'],
  ['mono', 'Colunas fixas'],
  ['segments', 'Ajustar à tela'],
];

const notFound = (container, text, href, label) =>
  container.replaceChildren(h('div', { class: 'page' }, h('p', {}, text), h('a', { class: 'button', href }, label)));

/**
 * ctx: {
 *   state: { currentKey, capo },       // tom que soa e capo iniciais
 *   save(state) -> Promise,            // onde guardar tom e capo
 *   back: { href, label },
 *   subtitle?: string,                 // ex.: "Culto domingo · 2 de 5"
 *   footer?: Node,                     // ex.: anterior / próxima do repertório
 *   menuItems?: Node[],
 * }
 */
function mountSongPage(container, song, ctx) {
  const settings = getSettingsState();
  const parsed = parseSong(song.source);
  let state = { ...ctx.state };
  let fontSize = settings.defaultFontSize;

  const view = () => ({ ...song, ...state });
  const bodyEl = h('div', { class: 'song-scroll' });
  const keyLabel = h('span', { class: 'stepper-value', 'aria-live': 'polite' });
  const capoLabel = h('span', { class: 'stepper-value', 'aria-live': 'polite' });
  const shapesNote = h('span', { class: 'shapes-note' });
  const resetButton = h('button', { class: 'button button-small', type: 'button', onclick: () => setState({ currentKey: song.originalKey }) }, 'Tom original');
  const simplifyToggle = h('input', { type: 'checkbox', checked: settings.simplifyChords, onchange: () => {
    updateSettings({ simplifyChords: simplifyToggle.checked });
    body.update({ simplify: simplifyToggle.checked });
  } });
  const layoutSelect = h(
    'select',
    { class: 'select', 'aria-label': 'Modo de exibição', onchange: () => {
      updateSettings({ layoutMode: layoutSelect.value });
      body.update({ layoutMode: layoutSelect.value });
    } },
    LAYOUTS.map(([value, label]) => h('option', { value }, label)),
  );
  layoutSelect.value = settings.layoutMode;

  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      ctx.save(state);
    }, 400);
  }

  function refreshControls() {
    keyLabel.textContent = formatKey(state.currentKey);
    capoLabel.textContent = String(state.capo);
    shapesNote.textContent = state.capo ? `formas de ${formatKey(viewKeys(view()).shapes)}` : '';
    resetButton.hidden = intervalBetween(song.originalKey, state.currentKey) === 0;
  }

  function setState(patch) {
    state = { ...state, ...patch, capo: clampCapo(patch.capo ?? state.capo) };
    body.update({ currentKey: state.currentKey, capo: state.capo });
    refreshControls();
    persist();
  }

  function setFont(delta) {
    fontSize = Math.min(32, Math.max(12, fontSize + delta));
    updateSettings({ defaultFontSize: fontSize });
    body.update({ fontSize });
  }

  const stepper = (label, value, onMinus, onPlus, names) =>
    h(
      'div',
      { class: 'stepper', role: 'group', 'aria-label': label },
      h('span', { class: 'stepper-label' }, label),
      h('button', { class: 'icon-button', type: 'button', 'aria-label': names[0], onclick: onMinus }, icon('minus')),
      value,
      h('button', { class: 'icon-button', type: 'button', 'aria-label': names[1], onclick: onPlus }, icon('plus')),
    );

  const menu = h(
    'details',
    { class: 'menu' },
    h('summary', { class: 'icon-button', 'aria-label': 'Mais opções' }, icon('more')),
    h('div', { class: 'menu-panel' }, h('label', { class: 'menu-row' }, 'Exibição', layoutSelect), ctx.menuItems ?? []),
  );

  container.replaceChildren(
    h(
      'div',
      { class: 'page page-song' },
      h(
        'header',
        { class: 'song-header' },
        h('a', { class: 'icon-button', href: ctx.back.href, 'aria-label': ctx.back.label }, icon('back')),
        h(
          'div',
          { class: 'song-heading' },
          ctx.subtitle ? h('p', { class: 'song-context' }, ctx.subtitle) : null,
          h('h1', {}, song.title),
          song.artist ? h('p', { class: 'muted' }, song.artist) : null,
        ),
        menu,
      ),
      h(
        'div',
        { class: 'song-controls' },
        stepper('Tom', keyLabel, () => setState({ currentKey: transposeKey(state.currentKey, -1) }), () => setState({ currentKey: transposeKey(state.currentKey, 1) }), ['Meio tom abaixo', 'Meio tom acima']),
        stepper('Capo', capoLabel, () => setState({ capo: state.capo - 1 }), () => setState({ capo: state.capo + 1 }), ['Diminuir capo', 'Aumentar capo']),
        shapesNote,
        resetButton,
        h('div', { class: 'font-buttons', role: 'group', 'aria-label': 'Tamanho da letra' },
          h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Diminuir letra', onclick: () => setFont(-2) }, 'A−'),
          h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Aumentar letra', onclick: () => setFont(2) }, 'A+')),
        h('label', { class: 'toggle' }, simplifyToggle, 'Simplificar'),
      ),
      bodyEl,
      ctx.footer ?? null,
    ),
  );

  const body = mountSongBody(bodyEl, {
    parsed,
    originalKey: song.originalKey,
    currentKey: state.currentKey,
    capo: state.capo,
    sourceCapo: song.sourceCapo ?? 0,
    notation: settings.chordNotation,
    simplify: settings.simplifyChords,
    layoutMode: settings.layoutMode,
    fontSize,
  });
  refreshControls();

  return () => {
    body.destroy();
    if (saveTimer) {
      clearTimeout(saveTimer);
      ctx.save(state);
    }
  };
}

/** Diálogo "Adicionar ao repertório": lista os repertórios e permite criar um novo. */
async function addToSetlistDialog(song) {
  const setlists = await listSetlists();
  const add = async (setlist) => {
    const saved = await saveSetlist(addSongs(setlist, [song]));
    dialog.close();
    toast(`Adicionada a "${saved.name}".`);
  };
  const dialog = openDialog({
    title: 'Adicionar ao repertório',
    content: h(
      'div',
      { class: 'dialog-list' },
      h('button', { class: 'button button-primary button-block', type: 'button', onclick: () => add(createSetlist()) }, icon('plus'), 'Novo repertório'),
      setlists.map((s) =>
        h('button', { class: 'list-button', type: 'button', onclick: () => add(s) }, h('span', {}, s.name), h('span', { class: 'muted small' }, `${s.items.length} músicas`)),
      ),
    ),
  });
}

export async function renderSong(container, [id]) {
  const song = await getSong(id);
  if (!song) return notFound(container, 'Música não encontrada.', '#/', 'Voltar à biblioteca');

  async function remove() {
    if (!window.confirm(`Excluir "${song.title}"? Ela também sai dos repertórios. Isso não pode ser desfeito.`)) return;
    await deleteSong(song.id);
    await removeSongFromSetlists(song.id);
    toast('Música excluída.');
    navigate('#/');
  }

  let latest = song;
  return mountSongPage(container, song, {
    state: { currentKey: song.currentKey, capo: song.capo },
    save: async (state) => {
      latest = await saveSong({ ...latest, ...state });
    },
    back: { href: '#/', label: 'Voltar à biblioteca' },
    menuItems: [
      h('button', { class: 'menu-row menu-link', type: 'button', onclick: () => addToSetlistDialog(latest) }, icon('list'), 'Adicionar ao repertório'),
      h('a', { class: 'menu-row menu-link', href: `#/musica/${encodeURIComponent(song.id)}/editar` }, icon('edit'), 'Editar cifra'),
      h('button', { class: 'menu-row menu-link danger', type: 'button', onclick: remove }, icon('trash'), 'Excluir música'),
    ],
  });
}

export async function renderSetlistSong(container, [setlistId, itemId]) {
  let setlist = await getSetlist(setlistId);
  const item = setlist?.items.find((it) => it.id === itemId);
  if (!item) return notFound(container, 'Item do repertório não encontrado.', '#/repertorios', 'Voltar aos repertórios');
  const setlistHref = `#/repertorio/${encodeURIComponent(setlist.id)}`;
  const song = await getSong(item.songId);
  if (!song) return notFound(container, 'Esta música foi excluída da biblioteca.', setlistHref, 'Voltar ao repertório');

  const { index, total, prev, next } = neighbors(setlist, itemId);
  const titles = new Map(await Promise.all([prev, next].filter(Boolean).map(async (it) => [it.id, (await getSong(it.songId))?.title ?? 'Música excluída'])));
  const navButton = (target, label, className) =>
    target
      ? h('a', { class: `setlist-nav-link ${className}`, href: setlistSongHash(setlist.id, target.id) }, h('span', { class: 'muted small' }, label), h('span', { class: 'setlist-nav-title' }, titles.get(target.id)))
      : h('span', { class: `setlist-nav-link ${className} is-empty` });

  const cleanup = mountSongPage(container, song, {
    state: { currentKey: item.key, capo: item.capo },
    save: async (state) => {
      // Relê para não perder mudanças feitas em outra tela.
      setlist = (await getSetlist(setlist.id)) ?? setlist;
      setlist = await saveSetlist(updateItem(setlist, itemId, { key: state.currentKey, capo: state.capo }));
    },
    back: { href: setlistHref, label: 'Voltar ao repertório' },
    subtitle: `${setlist.name} · ${index + 1} de ${total}`,
    footer: h('nav', { class: 'setlist-nav', 'aria-label': 'Músicas do repertório' }, navButton(prev, '‹ Anterior', 'prev'), navButton(next, 'Próxima ›', 'next')),
  });

  // No laptop: setas para a música anterior e a próxima.
  const onKey = (e) => {
    if (e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.key === 'ArrowRight' ? next : e.key === 'ArrowLeft' ? prev : null;
    if (target) navigate(setlistSongHash(setlist.id, target.id));
  };
  window.addEventListener('keydown', onKey);
  return () => {
    window.removeEventListener('keydown', onKey);
    cleanup();
  };
}
