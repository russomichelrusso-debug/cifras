// Renderizador por segmentos (celular): acorde preso à sílaba, a linha quebra sem desalinhar.

import { h } from '../../ui/dom.js';
import { toWords } from './layout.js';

function chordLyric(block, ctx) {
  const line = h('div', { class: 'seg-line' });
  for (const word of toWords(block.segments)) {
    const el = h('span', { class: 'seg-word' });
    for (const piece of word.pieces) {
      el.append(
        piece.chord
          ? h('span', { class: 'seg-piece has-chord' }, ctx.chordButton(piece.chord), h('span', { class: 'seg-lyric' }, piece.text || ' '))
          : h('span', { class: 'seg-piece' }, h('span', { class: 'seg-lyric' }, piece.text)),
      );
    }
    line.append(el);
  }
  return line;
}

function chordsOnly(block, ctx) {
  return h(
    'div',
    { class: 'seg-chords' },
    block.label ? h('span', { class: 'line-label' }, `${block.label}:`) : null,
    block.items.map((it) => (it.kind === 'chord' ? ctx.chordButton(it) : h('span', { class: 'deco' }, it.text))),
    block.repeat ? h('span', { class: 'repeat-badge' }, `×${block.repeat}`) : null,
  );
}

export function renderSegmentBlock(block, ctx) {
  switch (block.type) {
    case 'chordLyric':
      return chordLyric(block, ctx);
    case 'chords':
      return chordsOnly(block, ctx);
    case 'text':
      return h('p', { class: 'seg-text' }, block.label ? h('span', { class: 'line-label' }, `${block.label}: `) : null, block.text.trim());
    default:
      return null;
  }
}
