// Renderizador monoespaçado (tablet e laptop): fiel às colunas do texto original.

import { h } from '../../ui/dom.js';
import { chordLineText, layoutChordLine } from './layout.js';

/** Itens da linha com o texto exibido (transposto) e as colunas ajustadas. */
export function monoChordItems(block, chordText) {
  const minCol = block.label ? block.label.length + 2 : 0;
  const items = block.items.map((it) => ({ ...it, shown: it.kind === 'chord' ? chordText(it) : it.text }));
  return layoutChordLine(items.map((it) => ({ ...it, text: it.shown, original: it.text })), minCol);
}

function chordLine(block, ctx) {
  const items = monoChordItems(block, ctx.chordText);
  const line = h('div', { class: 'mono-line chord-line' });
  let length = 0;
  if (block.label) {
    line.append(h('span', { class: 'line-label' }, `${block.label}:`));
    length = block.label.length + 1;
  }
  for (const it of items) {
    line.append(' '.repeat(Math.max(0, it.col - length)));
    line.append(it.kind === 'chord' ? ctx.chordButton(it) : h('span', { class: 'deco' }, it.text));
    length = it.col + it.text.length;
  }
  if (block.repeat) line.append(' ', h('span', { class: 'repeat-badge' }, `×${block.repeat}`));
  return line;
}

export function renderMonoBlock(block, ctx) {
  switch (block.type) {
    case 'chordLyric':
      return h('div', { class: 'mono-pair' }, chordLine(block, ctx), h('div', { class: 'mono-line lyric-line' }, block.lyric || ' '));
    case 'chords':
      return chordLine(block, ctx);
    case 'text':
      return h('div', { class: 'mono-line text-line' }, block.label ? h('span', { class: 'line-label' }, `${block.label}: `) : null, block.text);
    default:
      return null;
  }
}

/** Largura, em caracteres, da linha mais longa (tablaturas ficam de fora: rolam sozinhas). */
export function monoWidth(parsed, chordText) {
  let max = 0;
  for (const s of parsed.sections) {
    for (const b of s.blocks) {
      if (b.items) max = Math.max(max, chordLineText(monoChordItems(b, chordText)).length + (b.repeat ? 4 : 0));
      if (b.lyric) max = Math.max(max, b.lyric.length);
      if (b.type === 'text') max = Math.max(max, b.text.length + (b.label ? b.label.length + 2 : 0));
    }
  }
  return max;
}
