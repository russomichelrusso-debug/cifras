// Tela da música: cifra, transposição, capo, tamanho da fonte, simplificar e modo de exibição.

import { navigate } from '../router.js';
import { clampCapo } from '../songs/model.js';
import { parseSong } from '../songs/parser.js';
import { deleteSong, getSong, saveSong } from '../storage/songs.repo.js';
import { getSettingsState, updateSettings } from '../store.js';
import { viewKeys } from '../theory/notation.js';
import { formatKey, intervalBetween, transposeKey } from '../theory/transpose.js';
import { h, icon, toast } from '../ui/dom.js';
import { mountSongBody } from './songBody.js';

const LAYOUTS = [
  ['auto', 'Automático'],
  ['mono', 'Colunas fixas'],
  ['segments', 'Ajustar à tela'],
];

export async function renderSong(container, [id]) {
  let song = await getSong(id);
  if (!song) {
    container.replaceChildren(h('div', { class: 'page' }, h('p', {}, 'Música não encontrada.'), h('a', { class: 'button', href: '#/' }, 'Voltar à biblioteca')));
    return undefined;
  }
  const settings = getSettingsState();
  const parsed = parseSong(song.source);
  let fontSize = settings.defaultFontSize;

  const bodyEl = h('div', { class: 'song-scroll' });
  const keyLabel = h('span', { class: 'stepper-value', 'aria-live': 'polite' });
  const capoLabel = h('span', { class: 'stepper-value', 'aria-live': 'polite' });
  const shapesNote = h('span', { class: 'shapes-note' });
  const resetButton = h('button', { class: 'button button-small', type: 'button', onclick: () => setKey(song.originalKey) }, 'Tom original');
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
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      song = await saveSong(song);
    }, 400);
  }

  function refreshControls() {
    const keys = viewKeys(song);
    keyLabel.textContent = formatKey(song.currentKey);
    capoLabel.textContent = song.capo ? String(song.capo) : '0';
    shapesNote.textContent = song.capo ? `formas de ${formatKey(keys.shapes)}` : '';
    resetButton.hidden = intervalBetween(song.originalKey, song.currentKey) === 0;
  }

  function setKey(key) {
    song = { ...song, currentKey: key };
    body.update({ currentKey: key });
    refreshControls();
    persist();
  }

  function setCapo(n) {
    song = { ...song, capo: clampCapo(n) };
    body.update({ capo: song.capo });
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

  async function remove() {
    if (!window.confirm(`Excluir "${song.title}"? Isso não pode ser desfeito.`)) return;
    await deleteSong(song.id);
    toast('Música excluída.');
    navigate('#/');
  }

  const menu = h(
    'details',
    { class: 'menu' },
    h('summary', { class: 'icon-button', 'aria-label': 'Mais opções' }, icon('more')),
    h(
      'div',
      { class: 'menu-panel' },
      h('label', { class: 'menu-row' }, 'Exibição', layoutSelect),
      h('a', { class: 'menu-row menu-link', href: `#/musica/${encodeURIComponent(song.id)}/editar` }, icon('edit'), 'Editar cifra'),
      h('button', { class: 'menu-row menu-link danger', type: 'button', onclick: remove }, icon('trash'), 'Excluir música'),
    ),
  );

  container.replaceChildren(
    h(
      'div',
      { class: 'page page-song' },
      h(
        'header',
        { class: 'song-header' },
        h('a', { class: 'icon-button', href: '#/', 'aria-label': 'Voltar à biblioteca' }, icon('back')),
        h('div', { class: 'song-heading' }, h('h1', {}, song.title), song.artist ? h('p', { class: 'muted' }, song.artist) : null),
        menu,
      ),
      h(
        'div',
        { class: 'song-controls' },
        stepper('Tom', keyLabel, () => setKey(transposeKey(song.currentKey, -1)), () => setKey(transposeKey(song.currentKey, 1)), ['Meio tom abaixo', 'Meio tom acima']),
        stepper('Capo', capoLabel, () => setCapo(song.capo - 1), () => setCapo(song.capo + 1), ['Diminuir capo', 'Aumentar capo']),
        shapesNote,
        resetButton,
        h('div', { class: 'font-buttons', role: 'group', 'aria-label': 'Tamanho da letra' },
          h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Diminuir letra', onclick: () => setFont(-2) }, 'A−'),
          h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Aumentar letra', onclick: () => setFont(2) }, 'A+')),
        h('label', { class: 'toggle' }, simplifyToggle, 'Simplificar'),
      ),
      bodyEl,
    ),
  );

  const body = mountSongBody(bodyEl, {
    parsed,
    originalKey: song.originalKey,
    currentKey: song.currentKey,
    capo: song.capo,
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
      saveSong(song);
    }
  };
}
