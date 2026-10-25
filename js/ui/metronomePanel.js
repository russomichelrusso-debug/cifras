// Metrônomo: um só para o app inteiro (continua tocando com o painel fechado).

import { MAX_BPM, MIN_BPM, clampBpm, createMetronome, tapTempo } from '../audio/metronome.js';
import { openDialog } from './dialog.js';
import { h, icon, toast } from './dom.js';

const beatListeners = new Set();
const stateListeners = new Set();
export const metronome = createMetronome({ onBeat: (beat) => beatListeners.forEach((fn) => fn(beat)) });

const notify = () => stateListeners.forEach((fn) => fn(metronome.running));
export const onMetronomeState = (fn) => {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
};

export function stopMetronome() {
  metronome.stop();
  notify();
}

/** Painel: andamento, compasso, tap tempo, tocar/parar e luz da batida. */
export function metronomePanel({ bpm = 80, beatsPerBar = 4, onChange }) {
  let current = { bpm: clampBpm(bpm), beatsPerBar };
  const value = h('output', { class: 'metro-bpm', 'aria-live': 'polite' });
  const slider = h('input', { type: 'range', class: 'metro-slider', min: String(MIN_BPM), max: String(MAX_BPM), 'aria-label': 'Andamento (BPM)', oninput: () => set({ bpm: Number(slider.value) }) });
  const beats = h('select', { class: 'select', 'aria-label': 'Batidas por compasso', onchange: () => set({ beatsPerBar: Number(beats.value) }) }, [2, 3, 4, 6].map((n) => h('option', { value: String(n) }, `${n} por compasso`)));
  const dots = h('div', { class: 'metro-dots', 'aria-hidden': 'true' });
  const play = h('button', { class: 'button button-primary metro-play', type: 'button', onclick: toggle });
  const taps = [];

  function set(patch) {
    current = { ...current, ...patch, bpm: clampBpm(patch.bpm ?? current.bpm) };
    draw();
    if (metronome.running) metronome.update(current.bpm, current.beatsPerBar);
    onChange?.(current);
  }

  function toggle() {
    try {
      if (metronome.running) metronome.stop();
      else metronome.start(current.bpm, current.beatsPerBar);
    } catch (err) {
      toast(err.message, { error: true });
    }
    notify();
    draw();
  }

  function draw() {
    value.textContent = String(current.bpm);
    slider.value = String(current.bpm);
    beats.value = String(current.beatsPerBar);
    dots.replaceChildren(...Array.from({ length: current.beatsPerBar }, (_, i) => h('span', { class: `metro-dot${i === 0 ? ' is-accent' : ''}` })));
    play.replaceChildren(icon(metronome.running ? 'pause' : 'play'), metronome.running ? 'Parar' : 'Tocar');
  }

  const onBeat = (beat) => {
    [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i === beat));
  };
  beatListeners.add(onBeat);

  const step = (delta, label) => h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': label, onclick: () => set({ bpm: current.bpm + delta }) }, delta > 0 ? `+${delta}` : `${delta}`);
  const panel = h(
    'div',
    { class: 'metro' },
    h('div', { class: 'metro-main' }, step(-5, 'Menos 5'), step(-1, 'Menos 1'), h('div', { class: 'metro-value' }, value, h('span', { class: 'muted small' }, 'BPM')), step(1, 'Mais 1'), step(5, 'Mais 5')),
    slider,
    dots,
    h('div', { class: 'row metro-actions' }, play, h('button', { class: 'button', type: 'button', onclick: () => {
      taps.push(performance.now());
      const bpmFromTap = tapTempo(taps);
      if (bpmFromTap) set({ bpm: bpmFromTap });
    } }, 'Tap (toque no ritmo)'), beats),
  );
  draw();
  return { element: panel, dispose: () => beatListeners.delete(onBeat) };
}

export function openMetronomeDialog(opts) {
  const panel = metronomePanel(opts);
  return openDialog({ title: 'Metrônomo', content: panel.element, className: 'metro-dialog', onClose: panel.dispose });
}
