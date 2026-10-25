// Afinador: nota e desvio pelo microfone, com as seis cordas da afinação padrão.

import { detectPitch, createSmoother, nearestString, noteOf } from '../audio/pitch.js';
import { openMic } from '../audio/mic.js';
import { getSettingsState, updateSettings } from '../store.js';
import { latinName } from '../theory/notes.js';
import { stepper } from '../ui/controls.js';
import { h, icon } from '../ui/dom.js';

const STRINGS = [['E', 2], ['A', 2], ['D', 3], ['G', 3], ['B', 3], ['E', 4]];
const IN_TUNE_CENTS = 5;
const HOLD_MS = 1500; // a última leitura fica na tela um pouco depois que a corda para de soar
const A4_RANGE = [430, 450];

const MIC_ERRORS = {
  NotAllowedError: 'Sem permissão para o microfone. Libere o acesso nas configurações do navegador e tente de novo.',
  NotFoundError: 'Nenhum microfone encontrado neste aparelho.',
  NotReadableError: 'O microfone está em uso por outro app.',
};

export function renderTuner(container) {
  const settings = getSettingsState();
  const noteName = (name) => (settings.noteNaming === 'americano' ? name : latinName(name));
  let a4 = settings.tunerA4;
  let mic = null;
  let raf = null;
  let lastHeard = 0;
  const smoother = createSmoother(5);

  const note = h('span', { class: 'tuner-note' }, '–');
  const octave = h('span', { class: 'tuner-octave' });
  const needle = h('div', { class: 'tuner-needle' });
  const centsText = h('span', { class: 'tuner-cents' });
  const status = h('p', { class: 'tuner-status', 'aria-live': 'polite' }, 'Ligue o microfone e toque uma corda.');
  const hzText = h('span', { class: 'muted small' });
  const strings = STRINGS.map(([name, oct], i) => h('li', { class: 'tuner-string' }, h('span', { class: 'muted small' }, `${6 - i}ª`), h('span', {}, noteName(name)), h('span', { class: 'muted small' }, oct)));
  const a4Label = h('span', { class: 'stepper-value' });
  const error = h('p', { class: 'note', role: 'alert', hidden: true });
  const toggle = h('button', { class: 'button button-primary', type: 'button', onclick: () => (mic ? stop() : start()) });

  function setA4(value) {
    a4 = Math.min(A4_RANGE[1], Math.max(A4_RANGE[0], value));
    a4Label.textContent = `${a4} Hz`;
    updateSettings({ tunerA4: a4 });
  }

  function show(hz) {
    const n = noteOf(hz, a4);
    const s = nearestString(hz, a4);
    note.textContent = noteName(n.name);
    octave.textContent = String(n.octave);
    needle.style.transform = `translateX(${Math.max(-50, Math.min(50, n.cents))}%)`;
    needle.dataset.tune = Math.abs(n.cents) <= IN_TUNE_CENTS ? 'ok' : 'off';
    centsText.textContent = `${n.cents > 0 ? '+' : n.cents < 0 ? '−' : ''}${Math.abs(n.cents)} cents`;
    hzText.textContent = `${hz.toFixed(1)} Hz`;
    strings.forEach((el, i) => el.classList.toggle('is-near', i === s.index));
    const target = `${6 - s.index}ª corda (${noteName(STRINGS[s.index][0])})`;
    if (Math.abs(s.cents) <= IN_TUNE_CENTS) status.textContent = `${target}: afinada`;
    else status.textContent = `${target}: ${s.cents < 0 ? 'baixa, aperte' : 'alta, solte'} (${Math.abs(s.cents)} cents)`;
  }

  function clear() {
    note.textContent = '–';
    octave.textContent = '';
    centsText.textContent = '';
    hzText.textContent = '';
    needle.style.transform = '';
    delete needle.dataset.tune;
    strings.forEach((el) => el.classList.remove('is-near'));
    status.textContent = mic ? 'Toque uma corda.' : 'Ligue o microfone e toque uma corda.';
  }

  // Lê a cada dois quadros (~30 vezes por segundo): suficiente para o ponteiro e leve no celular.
  let frame = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (frame++ % 2) return;
    const pitch = detectPitch(mic.read(), mic.sampleRate);
    if (pitch) {
      lastHeard = now;
      show(smoother.push(pitch.hz));
    } else if (lastHeard && now - lastHeard > HOLD_MS) {
      lastHeard = 0;
      smoother.reset();
      clear();
    }
  }

  async function start() {
    error.hidden = true;
    toggle.disabled = true;
    try {
      mic = await openMic();
      raf = requestAnimationFrame(loop);
    } catch (err) {
      error.textContent = MIC_ERRORS[err.name] ?? err.message;
      error.hidden = false;
    }
    toggle.disabled = false;
    refresh();
  }

  function stop() {
    cancelAnimationFrame(raf);
    mic?.close();
    mic = null;
    lastHeard = 0;
    smoother.reset();
    refresh();
  }

  function refresh() {
    toggle.replaceChildren(icon(mic ? 'pause' : 'play'), mic ? 'Desligar o microfone' : 'Ligar o microfone');
    clear();
  }

  container.replaceChildren(
    h(
      'div',
      { class: 'page page-tuner' },
      h('header', { class: 'page-header' }, h('h1', {}, 'Afinador')),
      h(
        'section',
        { class: 'tuner', 'aria-label': 'Leitura do afinador' },
        h('div', { class: 'tuner-reading' }, note, octave),
        h('div', { class: 'tuner-meter', 'aria-hidden': 'true' }, h('span', { class: 'tuner-mark' }), needle),
        h('div', { class: 'tuner-scale muted small', 'aria-hidden': 'true' }, h('span', {}, '−50'), centsText, h('span', {}, '+50')),
        status,
        h('ol', { class: 'tuner-strings', 'aria-label': 'Afinação padrão' }, strings),
        hzText,
      ),
      h('div', { class: 'row tuner-actions' }, toggle, stepper({ label: 'Lá', value: a4Label, onMinus: () => setA4(a4 - 1), onPlus: () => setA4(a4 + 1), names: ['Referência mais grave', 'Referência mais aguda'] })),
      error,
    ),
  );
  a4Label.textContent = `${a4} Hz`;
  refresh();

  // App em segundo plano: solta o microfone (o aparelho mostra que ele está em uso).
  const onHide = () => document.visibilityState === 'hidden' && mic && stop();
  document.addEventListener('visibilitychange', onHide);
  return () => {
    document.removeEventListener('visibilitychange', onHide);
    stop();
  };
}
