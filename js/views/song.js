// Tela da música: cifra, transposição, capo, tamanho da fonte, simplificar e modo de exibição.
// Usada direto da biblioteca (tom e capo salvos na música) e dentro de um repertório
// (tom e capo salvos no item do repertório, sem mexer na música).

import { editHash, navigate, setlistHash, setlistSongHash, setlistStageHash, stageHash } from '../router.js';
import { addSongs, createSetlist } from '../setlists/model.js';
import { clampCapo } from '../songs/model.js';
import { parseSong } from '../songs/parser.js';
import { createPatchSaver } from '../storage/patchSaver.js';
import { listSetlists, removeSongFromSetlists, saveSetlist } from '../storage/setlists.repo.js';
import { deleteSong, updateSong } from '../storage/songs.repo.js';
import { getSettingsState, updateSettings } from '../store.js';
import { viewKeys } from '../theory/notation.js';
import { formatKey, intervalBetween, transposeKey } from '../theory/transpose.js';
import { LAYOUT_OPTIONS, fontButtons, notFoundPage, stepper } from '../ui/controls.js';
import { openDialog } from '../ui/dialog.js';
import { metronomeButton, stopMetronome } from '../ui/metronomePanel.js';
import { h, icon, toast } from '../ui/dom.js';
import { renderChordDetail } from './chordInfo.js';
import { chordInfoFor, createChordDialog } from './chordPopup.js';
import { mountSongBody } from './songBody.js';
import { setlistContext, songContext } from './songContext.js';

const LAPTOP = window.matchMedia('(min-width: 1024px)');

/**
 * ctx (de songContext/setlistContext, mais):
 *   state: { currentKey, capo },       // tom que soa e capo iniciais
 *   saveState(state) -> Promise,       // onde guardar tom e capo
 *   back: { href, label },
 *   subtitle?: string,                 // ex.: "Culto domingo · 2 de 5"
 *   footer?: Node,                     // ex.: anterior / próxima do repertório
 *   menuItems?: (current) => Node[],   // current() = música com o tom e o capo atuais
 *   stageHref?: string,                // abre o modo palco
 */
function mountSongPage(container, song, ctx) {
  const settings = getSettingsState();
  const parsed = parseSong(song.source);
  let state = { ...ctx.state };
  let fontSize = settings.defaultFontSize;

  const current = () => ({ ...song, ...state });
  const stateSaver = createPatchSaver(() => ctx.saveState(state));
  const songSaver = createPatchSaver((patch) => updateSong(song.id, patch));
  const bodyEl = h('div', { class: 'song-scroll' });
  const panel = h('aside', { class: 'chord-panel', 'aria-label': 'Acorde', hidden: true });
  const chordDialog = createChordDialog();

  // Toque no acorde: celular e tablet abrem o card (e o detalhe no mesmo diálogo); laptop usa o painel lateral.
  function openChord(event) {
    const info = chordInfoFor(event, { parsed, currentKey: state.currentKey, capo: state.capo });
    if (!info) return;
    if (!LAPTOP.matches) {
      chordDialog.open(info);
      return;
    }
    panel.hidden = false;
    page.classList.add('has-panel');
    panel.replaceChildren(
      h('div', { class: 'chord-panel-bar' }, h('span', { class: 'muted small' }, 'Acorde'), h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Fechar painel', onclick: closePanel }, icon('close'))),
      renderChordDetail(info),
    );
    panel.scrollTop = 0;
  }

  function closePanel() {
    panel.hidden = true;
    page.classList.remove('has-panel');
  }
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
    LAYOUT_OPTIONS.map(([value, label]) => h('option', { value }, label)),
  );
  layoutSelect.value = settings.layoutMode;

  function refreshControls() {
    keyLabel.textContent = formatKey(state.currentKey);
    capoLabel.textContent = String(state.capo);
    shapesNote.textContent = state.capo ? `formas de ${formatKey(viewKeys(current()).shapes)}` : '';
    resetButton.hidden = intervalBetween(song.originalKey, state.currentKey) === 0;
  }

  function setState(patch) {
    state = { ...state, ...patch, capo: clampCapo(patch.capo ?? state.capo) };
    body.update({ currentKey: state.currentKey, capo: state.capo });
    refreshControls();
    stateSaver.schedule({});
  }

  // Metrônomo: o andamento fica salvo na música.
  const metro = metronomeButton({
    bpm: song.bpm ?? settings.metronome.bpm,
    beatsPerBar: settings.metronome.beatsPerBar,
    onChange: (v) => {
      updateSettings({ metronome: v });
      songSaver.schedule({ bpm: v.bpm });
    },
  });

  function setFont(delta) {
    fontSize = Math.min(32, Math.max(12, fontSize + delta));
    updateSettings({ defaultFontSize: fontSize });
    body.update({ fontSize });
  }

  const menu = h(
    'details',
    { class: 'menu' },
    h('summary', { class: 'icon-button', 'aria-label': 'Mais opções' }, icon('more')),
    h('div', { class: 'menu-panel' }, h('label', { class: 'menu-row' }, 'Exibição', layoutSelect), ctx.menuItems?.(current) ?? []),
  );

  const page = h(
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
        ctx.stageHref ? h('a', { class: 'button button-small stage-enter', href: ctx.stageHref }, icon('stage'), 'Palco') : null,
        menu,
      ),
      h(
        'div',
        { class: 'song-controls' },
        stepper({ label: 'Tom', value: keyLabel, onMinus: () => setState({ currentKey: transposeKey(state.currentKey, -1) }), onPlus: () => setState({ currentKey: transposeKey(state.currentKey, 1) }), names: ['Meio tom abaixo', 'Meio tom acima'] }),
        stepper({ label: 'Capo', value: capoLabel, onMinus: () => setState({ capo: state.capo - 1 }), onPlus: () => setState({ capo: state.capo + 1 }), names: ['Diminuir capo', 'Aumentar capo'] }),
        shapesNote,
        resetButton,
        fontButtons(setFont),
        h('label', { class: 'toggle' }, simplifyToggle, 'Simplificar'),
        metro.element,
      ),
      h('div', { class: 'song-main' }, h('div', { class: 'song-column' }, bodyEl, ctx.footer ?? null), panel),
    );
  container.replaceChildren(page);

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
    onChord: openChord,
  });
  refreshControls();

  return () => {
    chordDialog.close();
    metro.dispose();
    stopMetronome();
    body.destroy();
    stateSaver.flush();
    songSaver.flush();
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
  const ctx = await songContext(id);
  if (ctx.error) return notFoundPage(container, ctx.error.text, ctx.error.href, ctx.error.label);
  const { song } = ctx;

  async function remove() {
    if (!window.confirm(`Excluir "${song.title}"? Ela também sai dos repertórios. Isso não pode ser desfeito.`)) return;
    await deleteSong(song.id);
    await removeSongFromSetlists(song.id);
    toast('Música excluída.');
    navigate('#/');
  }

  return mountSongPage(container, song, {
    ...ctx,
    back: { href: '#/', label: 'Voltar à biblioteca' },
    stageHref: stageHash(song.id),
    menuItems: (current) => [
      h('button', { class: 'menu-row menu-link', type: 'button', onclick: () => addToSetlistDialog(current()) }, icon('list'), 'Adicionar ao repertório'),
      h('a', { class: 'menu-row menu-link', href: editHash(song.id) }, icon('edit'), 'Editar cifra'),
      h('button', { class: 'menu-row menu-link danger', type: 'button', onclick: remove }, icon('trash'), 'Excluir música'),
    ],
  });
}

export async function renderSetlistSong(container, [setlistId, itemId]) {
  const ctx = await setlistContext(setlistId, itemId);
  if (ctx.error) return notFoundPage(container, ctx.error.text, ctx.error.href, ctx.error.label);
  const { song, setlist, prev, next } = ctx;
  const navButton = (target, label, className) =>
    target
      ? h('a', { class: `setlist-nav-link ${className}`, href: setlistSongHash(setlist.id, target.id) }, h('span', { class: 'muted small' }, label), h('span', { class: 'setlist-nav-title' }, target.title))
      : h('span', { class: `setlist-nav-link ${className} is-empty` });

  const cleanup = mountSongPage(container, song, {
    ...ctx,
    back: { href: setlistHash(setlist.id), label: 'Voltar ao repertório' },
    stageHref: setlistStageHash(setlist.id, itemId),
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
