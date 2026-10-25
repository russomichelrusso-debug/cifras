// Diagrama de acorde em SVG: braço vertical, cordas da 6ª (esquerda) à 1ª (direita).
// Mostra x (não tocar) e o (solta), casa inicial, pestana e número dos dedos.

const SVG_NS = 'http://www.w3.org/2000/svg';
const FRETS = 5;
const W = 150;
const H = 182;
const LEFT = 30;
const TOP = 36;
const STRING_GAP = 20;
const FRET_GAP = 27;

function el(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

const xOf = (s) => LEFT + s * STRING_GAP;
const yOf = (row) => TOP + (row - 0.5) * FRET_GAP;

/** Texto acessível: "corda 6 casa 1, corda 5 casa 3, ..." */
export function describeShape(shape) {
  return shape.frets
    .map((f, s) => `corda ${6 - s} ${f === 'x' ? (shape.unknownStrings ? 'sem informação' : 'não tocar') : f === 0 ? 'solta' : `casa ${f}`}`)
    .join(', ');
}

export function chordDiagram(shape, { name = '' } = {}) {
  const base = shape.baseFret ?? 1;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chord-diagram', role: 'img', 'aria-label': `${name}: ${describeShape(shape)}` });

  // Pestana do braço (nut) ou número da casa inicial.
  if (base === 1) svg.append(el('rect', { x: xOf(0) - 1, y: TOP - 4, width: xOf(5) - xOf(0) + 2, height: 4, class: 'cd-nut', rx: 1 }));
  else svg.append(el('text', { x: LEFT - 12, y: yOf(1) + 4, class: 'cd-basefret', 'text-anchor': 'end' }, `${base}ª`));

  for (let r = 0; r <= FRETS; r++) svg.append(el('line', { x1: xOf(0), x2: xOf(5), y1: TOP + r * FRET_GAP, y2: TOP + r * FRET_GAP, class: 'cd-fret' }));
  for (let s = 0; s < 6; s++) svg.append(el('line', { x1: xOf(s), x2: xOf(s), y1: TOP, y2: TOP + FRETS * FRET_GAP, class: 'cd-string' }));

  // x / o acima do braço
  shape.frets.forEach((f, s) => {
    if (f === 'x') svg.append(el('text', { x: xOf(s), y: TOP - 12, class: 'cd-mark', 'text-anchor': 'middle' }, shape.unknownStrings ? '?' : '×'));
    else if (f === 0) svg.append(el('circle', { cx: xOf(s), cy: TOP - 16, r: 5, class: 'cd-open' }));
  });

  // Pestana
  if (shape.barre) {
    const from = 6 - shape.barre.from;
    const to = 6 - shape.barre.to;
    const y = yOf(shape.barre.fret - base + 1);
    svg.append(el('rect', { x: xOf(from) - 9, y: y - 9, width: xOf(to) - xOf(from) + 18, height: 18, rx: 9, class: 'cd-barre' }));
  }

  // Dedos
  shape.frets.forEach((f, s) => {
    if (typeof f !== 'number' || f === 0) return;
    const row = f - base + 1;
    if (row < 1 || row > FRETS) return;
    const onBarre = shape.barre && f === shape.barre.fret && s >= 6 - shape.barre.from && s <= 6 - shape.barre.to;
    const finger = shape.fingers?.[s];
    // Na pestana, mostra o número só nas pontas, como no papel.
    if (onBarre && s !== 6 - shape.barre.from && s !== 6 - shape.barre.to) return;
    svg.append(el('circle', { cx: xOf(s), cy: yOf(row), r: 9, class: 'cd-dot' }));
    if (finger) svg.append(el('text', { x: xOf(s), y: yOf(row) + 4, class: 'cd-finger', 'text-anchor': 'middle' }, String(finger)));
  });
  return svg;
}
