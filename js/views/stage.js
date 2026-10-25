// Modo palco: cifra em tela inteira, por páginas (toque, arraste, setas, pedal) ou por rolagem automática.
// Tela sempre acesa (Wake Lock), tela cheia quando o aparelho permite, metrônomo e atalhos de teclado.

import { navigate, setlistSongHash, setlistStageHash, songHash } from '../router.js';
import { neighbors, updateItem } from '../setlists/model.js';
import { clampPage, clampLevel, pageCount, pageLayout, scrollPxPerSecond } from '../stage/paging.js';
import { parseSong } from '../songs/parser.js';
import { getSetlist, saveSetlist } from '../storage/setlists.repo.js';
import { getSong, saveSong } from '../storage/songs.repo.js';
import { getSettingsState, updateSettings } from '../store.js';
import { formatKey, transposeKey } from '../theory/transpose.js';
import { h, icon, toast } from '../ui/dom.js';
import { metronome, onMetronomeState, openMetronomeDialog, stopMetronome } from '../ui/metronomePanel.js';
import { chordInfoFor, createChordDialog } from './chordPopup.js';
import { mountSongBody } from './songBody.js';

const GAP = 32;
const SWIPE_MIN = 50;

/** Pede a tela sempre acesa e renova quando o app volta ao primeiro plano. */
function keepScreenOn(onStatus) {
  let lock = null;
  let active = true;
  async function request() {
    if (!('wakeLock' in navigator)) return onStatus('unsupported');
    try {
      lock = await navigator.wakeLock.request('screen');
      onStatus('on');
      lock.addEventListener('release', () => active && document.visibilityState !== 'visible' && onStatus('off'));
    } catch {
      onStatus('off');
    }
  }
  const onVisible = () => document.visibilityState === 'visible' && active && request();
  document.addEventListener('visibilitychange', onVisible);
  request();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisible);
    lock?.release().catch(() => {});
  };
}

const WAKE_TEXT = {
  on: 'Tela sempre acesa',
  off: 'A tela pode apagar',
  unsupported: 'A tela pode apagar: aumente o bloqueio automático do aparelho',
};

/**
 * ctx: {
 *   state: { currentKey, capo }, save(state),
 *   exitHref, subtitle?,
 *   prev?: { href, title }, next?: { href, title },
 * }
 */
function mountStage(container, song, ctx) {
  const settings = getSettingsState();
  const parsed = parseSong(song.source);
  let state = { ...ctx.state };
  let mode = settings.stageMode;
  let fontSize = settings.stageFontSize;
  let level = clampLevel(song.scrollSpeed ?? settings.stageScrollSpeed);
  let bpm = song.bpm ?? settings.metronome.bpm;
  let page = 0;
  let pages = 1;
  let layout = pageLayout(window.innerWidth, { gap: GAP });
  let playing = false;
  let raf = null;
  const chordDialog = createChordDialog();

  const flow = h('div', { class: 'stage-flow' });
  const viewport = h('div', { class: 'stage-viewport', tabindex: '-1' }, flow);
  const keyLabel = h('span', { class: 'stepper-value' });
  const pageLabel = h('span', { class: 'stage-page', 'aria-live': 'polite' });
  const levelLabel = h('span', { class: 'stepper-value' });
  const wake = h('span', { class: 'stage-wake small' });
  const bpmLabel = h('span', {});
  const playButton = h('button', { class: 'button stage-play', type: 'button', onclick: () => setPlaying(!playing) });
  const modeButtons = ['pages', 'scroll'].map((m) =>
    h('button', { class: 'segmented-option', type: 'button', 'aria-pressed': String(m === mode), dataset: { mode: m }, onclick: () => setMode(m) }, m === 'pages' ? 'Páginas' : 'Rolagem'),
  );

  // ---------- Salvar ----------
  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      ctx.save(state);
    }, 400);
  }
  async function saveSongField(patch) {
    const fresh = (await getSong(song.id)) ?? song;
    await saveSong({ ...fresh, ...patch });
  }

  // ---------- Layout e páginas ----------
  // Área útil do palco (sem o espaçamento interno).
  function innerSize() {
    const cs = getComputedStyle(viewport);
    return {
      width: viewport.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      height: viewport.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
    };
  }

  function relayout() {
    const { width, height } = innerSize();
    stage.dataset.mode = mode;
    if (mode === 'pages') {
      layout = pageLayout(width, { gap: GAP });
      Object.assign(flow.style, { columnWidth: `${layout.columnWidth}px`, columnGap: `${GAP}px`, height: `${height}px`, width: `${width}px` });
    } else {
      Object.assign(flow.style, { columnWidth: '', columnGap: '', height: '', width: '' });
    }
  }

  function countPages() {
    if (mode !== 'pages') return;
    pages = pageCount(flow.scrollWidth, layout.step, GAP);
    goPage(page, { instant: true });
  }

  // Desloca com transform, não com scroll: o scroll para no fim do conteúdo e deixaria
  // a última página (com uma coluna só) desalinhada.
  function goPage(n, { instant = false } = {}) {
    page = clampPage(n, pages);
    flow.classList.toggle('is-instant', instant);
    flow.style.transform = mode === 'pages' ? `translateX(${-page * layout.step}px)` : '';
    pageLabel.textContent = `${page + 1} / ${pages}`;
  }

  function next() {
    if (mode === 'scroll') return viewport.scrollBy({ top: viewport.clientHeight * 0.8, behavior: 'smooth' });
    if (page < pages - 1) return goPage(page + 1);
    if (ctx.next) navigate(ctx.next.href); // pedal no fim da música: próxima do repertório
  }

  function prev() {
    if (mode === 'scroll') return viewport.scrollBy({ top: -viewport.clientHeight * 0.8, behavior: 'smooth' });
    goPage(page - 1);
  }

  function setMode(m) {
    mode = m;
    updateSettings({ stageMode: m });
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    setPlaying(false);
    page = 0;
    flow.style.transform = '';
    viewport.scrollTo({ left: 0, top: 0 });
    relayout();
    body.update({});
  }

  // ---------- Rolagem automática ----------
  function setPlaying(on) {
    playing = on && mode === 'scroll';
    playButton.replaceChildren(icon(playing ? 'pause' : 'play'), playing ? 'Pausar' : 'Rolar');
    cancelAnimationFrame(raf);
    if (!playing) return;
    let last = performance.now();
    let carry = 0;
    const step = (now) => {
      carry += (scrollPxPerSecond(level) * (now - last)) / 1000;
      last = now;
      const px = Math.floor(carry);
      if (px > 0) {
        viewport.scrollTop += px;
        carry -= px;
      }
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1) return setPlaying(false);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function setLevel(n) {
    level = clampLevel(n);
    levelLabel.textContent = String(level);
    saveSongField({ scrollSpeed: level });
  }

  // ---------- Tom e fonte ----------
  function setKey(delta) {
    state = { ...state, currentKey: transposeKey(state.currentKey, delta) };
    keyLabel.textContent = formatKey(state.currentKey);
    body.update({ currentKey: state.currentKey });
    persist();
  }

  function setFont(delta) {
    fontSize = Math.min(48, Math.max(14, fontSize + delta));
    updateSettings({ stageFontSize: fontSize });
    body.update({ fontSize });
  }

  // ---------- Toque, arraste e teclado ----------
  let down = null;
  viewport.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  viewport.addEventListener('pointerup', (e) => {
    if (!down || e.target.closest('.chord, button, a')) return (down = null);
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (mode !== 'pages') return;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? next() : prev();
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const x = (e.clientX - viewport.getBoundingClientRect().left) / viewport.clientWidth;
      if (x < 0.3) prev();
      else if (x > 0.7) next();
    }
  });

  function onKey(e) {
    if (e.target.closest('input, select, textarea, dialog') || e.altKey || e.ctrlKey || e.metaKey) return;
    const actions = {
      ArrowRight: next, ArrowDown: next, PageDown: next,
      ArrowLeft: prev, ArrowUp: prev, PageUp: prev,
      ' ': () => (mode === 'scroll' ? setPlaying(!playing) : next()),
      '+': () => setKey(1), '=': () => setKey(1), '-': () => setKey(-1),
      f: toggleFullscreen, m: toggleMetronome,
      n: () => ctx.next && navigate(ctx.next.href), p: () => ctx.prev && navigate(ctx.prev.href),
      Escape: () => !document.fullscreenElement && navigate(ctx.exitHref),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  }
  window.addEventListener('keydown', onKey);

  // ---------- Tela cheia e metrônomo ----------
  const canFullscreen = Boolean(document.fullscreenEnabled);
  function toggleFullscreen() {
    if (!canFullscreen) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => toast('Não foi possível entrar em tela cheia.', { error: true }));
  }

  function toggleMetronome() {
    try {
      if (metronome.running) stopMetronome();
      else {
        metronome.start(bpm, settings.metronome.beatsPerBar);
        refreshBpm();
      }
    } catch (err) {
      toast(err.message, { error: true });
    }
  }

  function refreshBpm() {
    bpmLabel.textContent = `${bpm} bpm${metronome.running ? ' ●' : ''}`;
  }
  const offMetro = onMetronomeState(refreshBpm);

  const metroButton = h('button', { class: 'button button-small', type: 'button', 'aria-label': 'Metrônomo', onclick: () => openMetronomeDialog({
    bpm,
    beatsPerBar: settings.metronome.beatsPerBar,
    onChange: (v) => {
      bpm = v.bpm;
      refreshBpm();
      saveSongField({ bpm });
      updateSettings({ metronome: { bpm: v.bpm, beatsPerBar: v.beatsPerBar } });
    },
  }) }, icon('metronome'), bpmLabel);

  const songLink = (target, label, cls) =>
    target ? h('a', { class: `stage-song-link ${cls}`, href: target.href, title: target.title }, label) : h('span', { class: `stage-song-link ${cls}` });

  const stage = h(
    'div',
    { class: 'stage', dataset: { mode } },
    h(
      'header',
      { class: 'stage-bar stage-top' },
      h('a', { class: 'icon-button', href: ctx.exitHref, 'aria-label': 'Sair do palco' }, icon('close')),
      h('div', { class: 'stage-title' }, ctx.subtitle ? h('span', { class: 'song-context' }, ctx.subtitle) : null, h('span', { class: 'stage-name' }, song.title)),
      h(
        'div',
        { class: 'stage-tools' },
        h('div', { class: 'stepper stepper-compact', role: 'group', 'aria-label': 'Tom' },
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Meio tom abaixo', onclick: () => setKey(-1) }, icon('minus')),
          keyLabel,
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Meio tom acima', onclick: () => setKey(1) }, icon('plus'))),
        h('div', { class: 'font-buttons', role: 'group', 'aria-label': 'Tamanho da letra' },
          h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Diminuir letra', onclick: () => setFont(-2) }, 'A−'),
          h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Aumentar letra', onclick: () => setFont(2) }, 'A+')),
        h('div', { class: 'segmented', role: 'group', 'aria-label': 'Modo do palco' }, modeButtons),
        metroButton,
        canFullscreen ? h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Tela cheia', onclick: toggleFullscreen }, icon('stage')) : null,
      ),
    ),
    viewport,
    h(
      'footer',
      { class: 'stage-bar stage-bottom' },
      songLink(ctx.prev, '‹ Anterior', 'prev'),
      h(
        'div',
        { class: 'stage-center' },
        h('div', { class: 'stage-pager' },
          h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Página anterior', onclick: prev }, icon('back')),
          pageLabel,
          h('button', { class: 'icon-button icon-flip', type: 'button', 'aria-label': 'Próxima página', onclick: next }, icon('back'))),
        h('div', { class: 'stage-scroller' },
          playButton,
          h('div', { class: 'stepper stepper-compact', role: 'group', 'aria-label': 'Velocidade da rolagem' },
            h('span', { class: 'stepper-label' }, 'Vel.'),
            h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Mais devagar', onclick: () => setLevel(level - 1) }, icon('minus')),
            levelLabel,
            h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Mais rápido', onclick: () => setLevel(level + 1) }, icon('plus')))),
        wake,
      ),
      songLink(ctx.next, 'Próxima ›', 'next'),
    ),
  );
  container.replaceChildren(stage);

  keyLabel.textContent = formatKey(state.currentKey);
  levelLabel.textContent = String(level);
  refreshBpm();
  setPlaying(false);
  relayout();

  const body = mountSongBody(flow, {
    parsed,
    originalKey: song.originalKey,
    currentKey: state.currentKey,
    capo: state.capo,
    sourceCapo: song.sourceCapo ?? 0,
    notation: settings.chordNotation,
    simplify: settings.simplifyChords,
    layoutMode: settings.layoutMode,
    fontSize,
    isPhone: window.innerWidth < 600,
    measureWidth: () => (mode === 'pages' ? layout.columnWidth : innerSize().width),
    onDraw: () => requestAnimationFrame(countPages),
    onChord: (item) => {
      const info = chordInfoFor(item, { song, state, parsed });
      if (info) chordDialog.open(info);
    },
  });

  const resize = new ResizeObserver(() => {
    relayout();
    body.update({});
  });
  resize.observe(viewport);
  const releaseWake = keepScreenOn((status) => {
    wake.textContent = WAKE_TEXT[status];
    wake.dataset.status = status;
  });
  viewport.focus({ preventScroll: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    resize.disconnect();
    body.destroy();
    chordDialog.close();
    releaseWake();
    offMetro();
    stopMetronome();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (saveTimer) {
      clearTimeout(saveTimer);
      ctx.save(state);
    }
  };
}

const notFound = (container, text, href) =>
  container.replaceChildren(h('div', { class: 'page' }, h('p', {}, text), h('a', { class: 'button', href }, 'Voltar')));

export async function renderStage(container, [id]) {
  const song = await getSong(id);
  if (!song) return notFound(container, 'Música não encontrada.', '#/');
  let latest = song;
  return mountStage(container, song, {
    state: { currentKey: song.currentKey, capo: song.capo },
    save: async (state) => {
      latest = await saveSong({ ...((await getSong(song.id)) ?? latest), ...state });
    },
    exitHref: songHash(song.id),
  });
}

export async function renderSetlistStage(container, [setlistId, itemId]) {
  let setlist = await getSetlist(setlistId);
  const item = setlist?.items.find((it) => it.id === itemId);
  if (!item) return notFound(container, 'Item do repertório não encontrado.', '#/repertorios');
  const song = await getSong(item.songId);
  if (!song) return notFound(container, 'Esta música foi excluída da biblioteca.', `#/repertorio/${encodeURIComponent(setlistId)}`);
  const { index, total, prev, next } = neighbors(setlist, itemId);
  const target = async (it) => it && { href: setlistStageHash(setlist.id, it.id), title: (await getSong(it.songId))?.title ?? 'Música excluída' };
  return mountStage(container, song, {
    state: { currentKey: item.key, capo: item.capo },
    save: async (state) => {
      setlist = (await getSetlist(setlist.id)) ?? setlist;
      setlist = await saveSetlist(updateItem(setlist, itemId, { key: state.currentKey, capo: state.capo }));
    },
    exitHref: setlistSongHash(setlist.id, itemId),
    subtitle: `${setlist.name} · ${index + 1} de ${total}`,
    prev: await target(prev),
    next: await target(next),
  });
}
