// Controles repetidos entre a tela da música e o palco.

import { h, icon } from './dom.js';

/** [−] valor [+]. `names` são os rótulos acessíveis dos dois botões; `label` aparece só se `showLabel`. */
export const stepper = ({ label, value, onMinus, onPlus, names, showLabel = true, compact = false }) =>
  h(
    'div',
    { class: `stepper${compact ? ' stepper-compact' : ''}`, role: 'group', 'aria-label': label },
    showLabel ? h('span', { class: 'stepper-label' }, label) : null,
    h('button', { class: 'icon-button', type: 'button', 'aria-label': names[0], onclick: onMinus }, icon('minus')),
    value,
    h('button', { class: 'icon-button', type: 'button', 'aria-label': names[1], onclick: onPlus }, icon('plus')),
  );

/** A− / A+ */
export const fontButtons = (onDelta) =>
  h('div', { class: 'font-buttons', role: 'group', 'aria-label': 'Tamanho da letra' },
    h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Diminuir letra', onclick: () => onDelta(-2) }, 'A−'),
    h('button', { class: 'icon-button text-button', type: 'button', 'aria-label': 'Aumentar letra', onclick: () => onDelta(2) }, 'A+'));

/** Página simples de "não encontrado" com um link de volta. */
export const notFoundPage = (container, text, href, label = 'Voltar') =>
  container.replaceChildren(h('div', { class: 'page' }, h('p', {}, text), h('a', { class: 'button', href }, label)));

export const LAYOUT_OPTIONS = [
  ['auto', 'Automático'],
  ['mono', 'Colunas fixas'],
  ['segments', 'Ajustar à tela'],
];
