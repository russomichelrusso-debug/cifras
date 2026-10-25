// Card rápido e detalhe do acorde (diagrama + análise harmônica), como nas imagens de referência.

import { playShape } from '../audio/chordPlayer.js';
import { lookupShapes } from '../chordlib/lookup.js';
import { formatChord } from '../theory/chords.js';
import { FUNCTION_NAMES, FUNCTION_TEXT, KIND_TEXT, analyzeChord, harmonicField, keyName } from '../theory/harmony.js';
import { pcOf } from '../theory/notes.js';
import { formatKey } from '../theory/transpose.js';
import { chordDiagram } from '../ui/chordDiagram.js';
import { append, h, icon, toast } from '../ui/dom.js';
import { keySelect } from '../ui/keySelect.js';

const SOURCE_LABEL = { open: 'Posição aberta', barre: 'Pestana', site: 'Desenho do site' };

/**
 * Junta tudo o que o card e o detalhe precisam.
 * shapeChord: o acorde como aparece na tela (forma tocada); soundingChord: o que soa (forma + capo).
 */
export function chordInfo({ shapeChord, soundingChord = shapeChord, key, capo = 0, siteDiagram = null, notation = 'br', noteNaming = 'chordUS_noteLatin' }) {
  return {
    shapeChord,
    soundingChord,
    name: formatChord(shapeChord, { notation }),
    soundingName: formatChord(soundingChord, { notation }),
    key,
    capo,
    notation,
    latinNotes: noteNaming !== 'americano',
    shapes: lookupShapes(shapeChord, { siteDiagram }),
  };
}

const fnClass = (fn) => `fn-${fn ?? 'none'}`;

/** Duas etiquetas: função e grau ("Subdominante" + "4º grau de C"). */
function summary(analysis, key, notation) {
  const k = formatKey(key);
  switch (analysis.kind) {
    case 'diatonic':
      return [FUNCTION_NAMES[analysis.function], `${analysis.degree}º grau de ${k}`];
    case 'harmonic':
      return [FUNCTION_NAMES[analysis.function], `${analysis.roman} da menor harmônica`];
    case 'melodic':
      return [FUNCTION_NAMES[analysis.function], `${analysis.roman} da menor melódica`];
    case 'secondaryDominant':
      return ['Dominante secundária', `${analysis.roman} · prepara ${formatChord(analysis.target.chord, { notation })}`];
    case 'borrowed':
      return ['Empréstimo modal', `${analysis.roman} de ${analysis.borrowedFrom}`];
    default:
      return ['Fora do campo', analysis.roman];
  }
}

const noteText = (n, latin) => (latin ? n.latin : n.name);

function capoNote(info) {
  return info.capo ? h('p', { class: 'muted small' }, `Com capo ${info.capo}: forma de ${info.name}, soa como ${info.soundingName}.`) : null;
}

/** Diagrama com setas para as variações. */
function diagramCarousel(info, { compact = false } = {}) {
  const { shapes, approx, bassNote } = info.shapes;
  const wrap = h('div', { class: `diagram-carousel${compact ? ' is-compact' : ''}` });
  if (!shapes.length) {
    wrap.append(h('div', { class: 'diagram-empty' }, h('p', {}, 'Sem diagrama para este acorde.'), h('p', { class: 'muted small' }, 'As notas acima continuam valendo.')));
    return wrap;
  }
  let index = 0;
  const figure = h('div', { class: 'diagram-figure' });
  const counter = h('span', { class: 'muted small', 'aria-live': 'polite' });
  const listen = h('button', { class: 'button button-small', type: 'button', onclick: () => {
    try {
      playShape(shapes[index].frets, { capo: info.capo });
    } catch (err) {
      toast(err.message, { error: true });
    }
  } }, icon('sound'), 'Ouvir');
  const prev = h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Forma anterior', onclick: () => show(index - 1) }, icon('back'));
  const next = h('button', { class: 'icon-button icon-flip', type: 'button', 'aria-label': 'Próxima forma', onclick: () => show(index + 1) }, icon('back'));
  function show(i) {
    index = (i + shapes.length) % shapes.length;
    const shape = shapes[index];
    figure.replaceChildren(chordDiagram(shape, { name: info.name }));
    counter.textContent = `${SOURCE_LABEL[shape.source]}${shapes.length > 1 ? ` · ${index + 1} de ${shapes.length}` : ''}`;
  }
  append(wrap, [
    h('div', { class: 'diagram-row' }, shapes.length > 1 ? prev : null, figure, shapes.length > 1 ? next : null),
    h('div', { class: 'row diagram-meta' }, counter, listen),
    approx ? h('p', { class: 'note small' }, approx) : null,
    bassNote ? h('p', { class: 'muted small' }, `Baixo: toque ${bassNote} na corda mais grave.`) : null,
    shapes[0].source === 'site' ? h('p', { class: 'muted small' }, 'O desenho do site não diferencia corda solta de abafada (?).') : null,
  ]);
  show(0);
  return wrap;
}

/** Card rápido: nome, tipo, função, notas, diagrama e "Ver detalhes". */
export function renderChordCard(info, { onDetails }) {
  const analysis = analyzeChord(info.soundingChord, info.key);
  const [fn, degree] = summary(analysis, info.key, info.notation);
  return h(
    'div',
    { class: 'chord-card' },
    h('h2', { class: 'chord-card-name' }, info.name),
    h('p', { class: 'muted' }, analysis.quality),
    h('p', { class: `chord-chip ${fnClass(analysis.function)}` }, `${fn} · ${degree}`),
    h('p', { class: 'chord-card-notes' }, analysis.notes.map((n) => noteText(n, info.latinNotes)).join(' · ')),
    capoNote(info),
    analysis.inversion ? h('p', { class: 'muted small' }, analysis.inversion.label) : null,
    diagramCarousel(info, { compact: true }),
    h('button', { class: 'button button-primary button-block', type: 'button', onclick: onDetails }, 'Ver detalhes'),
  );
}

function section(title, ...children) {
  return h('section', { class: 'detail-section' }, h('h3', { class: 'detail-title' }, title), children);
}

function bars(label, value, kind) {
  return h(
    'div',
    { class: 'bars', role: 'meter', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '5', 'aria-valuenow': String(value) },
    h('span', { class: 'bars-label' }, label),
    h('span', { class: `bars-track bars-${kind}` }, Array.from({ length: 5 }, (_, i) => h('span', { class: `bar${i < value ? ' is-on' : ''}` }))),
  );
}

/** Detalhe completo. `onKeyChange` troca só o tom da análise (hipótese local, não muda a música). */
export function renderChordDetail(info, { onBack = null } = {}) {
  let key = info.key;
  const root = h('div', { class: 'chord-detail' });

  function draw() {
    const analysis = analyzeChord(info.soundingChord, key);
    const [fn, degree] = summary(analysis, key, info.notation);
    const field = harmonicField(key);
    const isCurrent = (c) => pcOf(c.root) === pcOf(info.soundingChord.root) && c.triad === info.soundingChord.triad;
    const fieldChip = (f) =>
      h('span', { class: `field-chip${isCurrent(f.chord) ? ' is-current' : ''}` }, h('span', { class: 'field-chip-name' }, formatChord(f.chord, { notation: info.notation })), h('span', { class: 'field-chip-roman' }, f.roman));
    const keyChanged = formatKey(key) !== formatKey(info.key);

    root.replaceChildren();
    append(root, [
      onBack ? h('button', { class: 'link-button', type: 'button', onclick: onBack }, '‹ Voltar') : null,
      h(
        'header',
        { class: 'detail-header' },
        h(
          'div',
          { class: 'detail-heading' },
          h('h2', { class: 'chord-card-name' }, info.name),
          h('p', { class: 'muted' }, analysis.quality),
          h('div', { class: 'row' }, h('span', { class: `chord-chip ${fnClass(analysis.function)}` }, fn), h('span', { class: 'chord-chip chip-plain' }, degree)),
          analysis.inversion ? h('p', { class: 'muted small' }, analysis.inversion.label) : null,
          capoNote(info),
        ),
        h(
          'label',
          { class: 'detail-key' },
          h('span', { class: 'detail-key-label' }, 'Tonalidade da análise'),
          keySelect({ value: key, onChange: (k) => { key = k; draw(); } }),
          keyChanged ? h('button', { class: 'link-button small', type: 'button', onclick: () => { key = info.key; draw(); } }, `Voltar para ${keyName(info.key)}`) : null,
        ),
      ),
      keyChanged ? h('p', { class: 'note small' }, `Análise como se o trecho estivesse em ${keyName(key)}. A música não muda.`) : null,
      diagramCarousel(info),
      section(
        'Como o acorde é formado',
        h(
          'div',
          { class: 'note-grid' },
          analysis.notes.map((n) =>
            h('div', { class: 'note-cell' }, h('span', { class: 'note-degree' }, n.label), h('span', { class: 'note-interval' }, n.interval), h('span', { class: 'note-name' }, noteText(n, info.latinNotes))),
          ),
        ),
      ),
      section(
        `No campo harmônico de ${formatKey(key)}`,
        h('div', { class: 'field-row' }, field.main.map(fieldChip)),
        field.extra.length ? h('p', { class: 'muted small' }, 'Da menor harmônica e melódica:') : null,
        field.extra.length ? h('div', { class: 'field-row' }, field.extra.map(fieldChip)) : null,
      ),
      h(
        'div',
        { class: 'detail-pair' },
        section(
          'Função harmônica',
          h('p', { class: 'detail-strong' }, fn),
          h('p', { class: 'muted small' }, analysis.kind === 'diatonic' ? `${analysis.degree}º grau · ${fn}` : `${analysis.roman} · ${KIND_TEXT[analysis.kind]}`),
          h('p', {}, analysis.function ? FUNCTION_TEXT[analysis.function] : KIND_TEXT[analysis.kind]),
        ),
        section(
          'Caráter sonoro',
          h('p', { class: 'detail-strong' }, analysis.character.label),
          h('div', { class: 'row' }, analysis.character.tags.map((t) => h('span', { class: 'chord-chip fn-subdominant' }, t))),
          bars('Estabilidade', analysis.character.stability, 'stability'),
          bars('Tensão', analysis.character.tension, 'tension'),
        ),
      ),
      section(
        'Substituições possíveis',
        analysis.substitutions.length
          ? h(
              'div',
              { class: 'subs-grid' },
              analysis.substitutions.map((s) =>
                h('div', { class: 'sub-cell' }, h('span', { class: 'sub-name' }, formatChord(s.chord, { notation: info.notation })), s.roman ? h('span', { class: 'sub-roman' }, s.roman) : null, h('span', { class: 'muted small' }, s.label)),
              ),
            )
          : h('p', { class: 'muted' }, 'Nenhuma substituição comum para este acorde.'),
        analysis.substitutions.length ? h('p', { class: 'muted small' }, 'Confira a melodia e a condução das vozes antes de trocar.') : null,
      ),
      h('section', { class: 'detail-tip' }, h('h3', { class: 'detail-title' }, 'Dica rápida'), h('p', {}, analysis.tip)),
    ]);
  }
  draw();
  return root;
}
