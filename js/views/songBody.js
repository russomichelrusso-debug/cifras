// Monta o corpo da cifra num container e redesenha quando a largura ou as opções mudam.

import { displayChord, viewKeys } from '../theory/notation.js';
import { h } from '../ui/dom.js';
import { chooseMode, renderSongBody } from './render/index.js';

/**
 * opts: { parsed, originalKey, currentKey, capo, notation, simplify, layoutMode, fontSize, onChord }
 * Retorna { update(patch), destroy(), mode() }.
 */
export function mountSongBody(container, initial) {
  let opts = { ...initial };
  let currentMode = null;
  const probe = h('span', { class: 'mono-probe', 'aria-hidden': 'true' }, 'MMMMMMMMMM');
  const host = h('div', { class: 'song-body-host' });
  container.replaceChildren(host, probe);

  function draw() {
    const keys = viewKeys(opts);
    const chordText = (item) => displayChord(item.chord, { shift: keys.shift, key: keys.shapes, notation: opts.notation, simplify: opts.simplify });
    container.style.setProperty('--song-font', `${opts.fontSize}px`);
    const charWidth = probe.getBoundingClientRect().width / 10 || opts.fontSize * 0.6;
    const mode = chooseMode(opts.parsed, { preference: opts.layoutMode, containerWidth: container.clientWidth, charWidth, chordText });
    currentMode = mode;
    host.replaceChildren(renderSongBody(opts.parsed, { mode, chordText, onChord: opts.onChord }));
  }

  let lastWidth = 0;
  const observer = new ResizeObserver(() => {
    if (Math.abs(container.clientWidth - lastWidth) < 1) return;
    lastWidth = container.clientWidth;
    draw();
  });
  observer.observe(container);
  draw();

  return {
    update(patch) {
      opts = { ...opts, ...patch };
      draw();
    },
    destroy: () => observer.disconnect(),
    mode: () => currentMode,
  };
}
