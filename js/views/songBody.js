// Monta o corpo da cifra num container e redesenha quando a largura ou as opções mudam.

import { displayChord, shownChord, viewKeys } from '../theory/notation.js';
import { h } from '../ui/dom.js';
import { chooseMode, renderSongBody } from './render/index.js';

/**
 * opts: { parsed, originalKey, currentKey, capo, sourceCapo, notation, simplify, layoutMode, fontSize,
 *         onChord?({ item, shapeChord, soundingChord, sameAsText }),
 *         measureWidth?() -> número,   // largura para escolher o modo (no palco, a da coluna)
 *         observe = true,             // false: quem chama cuida do tamanho e chama update({})
 *         onDraw?() }                 // depois de cada desenho (o palco recalcula as páginas)
 * Retorna { update(patch), destroy(), mode() }.
 */
export function mountSongBody(container, initial) {
  let opts = { observe: true, ...initial };
  let currentMode = null;
  const probe = h('span', { class: 'mono-probe', 'aria-hidden': 'true' }, 'MMMMMMMMMM');
  const host = h('div', { class: 'song-body-host' });
  container.replaceChildren(host, probe);

  function draw() {
    const keys = viewKeys(opts);
    const shape = { shift: keys.shift, key: keys.shapes, simplify: opts.simplify };
    // Cada acorde é transposto e formatado uma vez por desenho (a escolha do modo também mede o texto).
    const texts = new Map();
    const chordText = (item) => {
      if (!texts.has(item)) texts.set(item, displayChord(item.chord, { ...shape, notation: opts.notation }));
      return texts.get(item);
    };
    // A forma tocada e o que soa saem das mesmas opções do desenho.
    const onChord = opts.onChord && ((item) => item.chord && opts.onChord({
      item,
      shapeChord: shownChord(item.chord, shape),
      soundingChord: shownChord(item.chord, { shift: keys.soundingShift, key: opts.currentKey, simplify: opts.simplify }),
      sameAsText: keys.shift === 0 && !opts.simplify,
    }));
    container.style.setProperty('--song-font', `${opts.fontSize}px`);
    const charWidth = probe.getBoundingClientRect().width / 10 || opts.fontSize * 0.6;
    const width = opts.measureWidth?.() ?? container.clientWidth;
    currentMode = chooseMode(opts.parsed, { preference: opts.layoutMode, containerWidth: width, charWidth, chordText });
    host.replaceChildren(renderSongBody(opts.parsed, { mode: currentMode, chordText, onChord }));
    opts.onDraw?.();
  }

  draw();
  let lastWidth = container.clientWidth;
  const observer = opts.observe
    ? new ResizeObserver(() => {
        if (Math.abs(container.clientWidth - lastWidth) < 1) return;
        lastWidth = container.clientWidth;
        draw();
      })
    : null;
  observer?.observe(container);

  return {
    update(patch) {
      opts = { ...opts, ...patch };
      draw();
    },
    destroy: () => observer?.disconnect(),
    mode: () => currentMode,
  };
}
