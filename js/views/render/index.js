// Corpo da cifra: seções e blocos comuns aos dois modos; linhas delegadas ao renderizador do modo.

import { h } from '../../ui/dom.js';
import { monoWidth, renderMonoBlock } from './monospace.js';
import { renderSegmentBlock } from './segments.js';

const PHONE_MAX_WIDTH = 600;

/**
 * ctx: {
 *   mode: "mono" | "segments",
 *   chordText(item) -> string,          // texto exibido (transposto, notação, simplificação)
 *   onChord?(item, element)
 * }
 */
export function renderSongBody(parsed, ctx) {
  const chordButton = (item) =>
    h(
      'button',
      { class: `chord${item.optional ? ' chord-optional' : ''}`, type: 'button', onclick: (e) => ctx.onChord?.(item, e.currentTarget) },
      ctx.chordText(item),
    );
  const lineCtx = { ...ctx, chordButton };
  const renderLine = ctx.mode === 'mono' ? renderMonoBlock : renderSegmentBlock;

  const body = h('div', { class: `song-body mode-${ctx.mode}` });
  for (const section of parsed.sections) {
    const el = h('section', { class: 'song-section' }, section.name ? h('h3', { class: 'section-title' }, section.name) : null);
    for (const block of section.blocks) {
      el.append(renderCommonBlock(block) ?? renderLine(block, lineCtx) ?? '');
    }
    body.append(el);
  }
  return body;
}

function renderCommonBlock(block) {
  switch (block.type) {
    case 'blank':
      return h('div', { class: 'gap', 'aria-hidden': 'true' });
    case 'tab':
      return h('pre', { class: 'tab', tabindex: '0', 'aria-label': 'Tablatura' }, block.lines.join('\n'));
    case 'repeat':
      return h('div', { class: 'repeat-line' }, h('span', { class: 'repeat-badge' }, `×${block.times}`));
    case 'sectionRef':
      return h('div', { class: 'section-ref' }, `↻ ${block.name}`);
    default:
      return null;
  }
}

/**
 * Celular: segmentos. Tablet e laptop: monoespaçado, se a linha mais longa couber.
 * `isPhone` vem à parte porque no palco a largura medida é a da coluna, não a da tela.
 */
export function chooseMode(parsed, { preference = 'auto', containerWidth, charWidth, chordText, isPhone = containerWidth < PHONE_MAX_WIDTH }) {
  if (preference === 'mono' || preference === 'segments') return preference;
  if (isPhone) return 'segments';
  return monoWidth(parsed, chordText) * charWidth <= containerWidth ? 'mono' : 'segments';
}
