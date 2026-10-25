// <select> com os 24 tons.

import { ALL_KEYS, formatKey } from '../theory/transpose.js';
import { h } from './dom.js';

export function keySelect({ value, onChange, id }) {
  const group = (mode, label) =>
    h('optgroup', { label }, ALL_KEYS.filter((k) => k.mode === mode).map((k) => h('option', { value: formatKey(k) }, formatKey(k))));
  const select = h('select', { id, class: 'select', onchange: () => onChange(ALL_KEYS.find((k) => formatKey(k) === select.value)) }, group('major', 'Maiores'), group('minor', 'Menores'));
  if (value) select.value = formatKey(value);
  return select;
}
