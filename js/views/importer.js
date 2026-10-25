// Importar: colar texto ou abrir .txt -> prévia com tom sugerido e avisos -> salvar.

import { navigate, songHash } from '../router.js';
import { clampCapo, createSong } from '../songs/model.js';
import { parseSong, songChords } from '../songs/parser.js';
import { saveSong } from '../storage/songs.repo.js';
import { getSettingsState } from '../store.js';
import { rankKeys } from '../theory/keyDetect.js';
import { formatKey, transposeKey } from '../theory/transpose.js';
import { h, icon, toast } from '../ui/dom.js';
import { keySelect } from '../ui/keySelect.js';
import { mountSongBody } from './songBody.js';

const PLACEHOLDER = `[Verso 1]
C              G
Tudo é perda, a tua graça é...

Ou cole a cifra inteira copiada do site.`;

const WARNING_TEXT = {
  unknownChord: (w) => `Linha ${w.line}: não reconheci "${w.text}" como acorde.`,
  bareInlineChord: (w) => `Linha ${w.line}: "${w.text}" pode ser um acorde no meio da letra. Ficou como texto.`,
};

export function renderImporter(container) {
  const settings = getSettingsState();
  let parsed = null;
  let key = null;
  let body = null;
  let keyTouched = false;

  const textarea = h('textarea', { class: 'input source-input', placeholder: PLACEHOLDER, spellcheck: 'false', 'aria-label': 'Texto da cifra', oninput: () => schedule() });
  const title = h('input', { class: 'input', id: 'imp-title', autocomplete: 'off' });
  const artist = h('input', { class: 'input', id: 'imp-artist', autocomplete: 'off' });
  const capo = h('input', { class: 'input input-narrow', id: 'imp-capo', type: 'number', min: '0', max: '11', value: '0', oninput: () => refreshSounding() });
  const soundingNote = h('p', { class: 'muted small' });
  const keyPicker = keySelect({ id: 'imp-key', onChange: (v) => setKey(v, { fromUser: true }) });
  keyPicker.hidden = true; // aparece quando há um tom (depois de ler o texto)
  const suggestions = h('div', { class: 'row chips', 'aria-label': 'Tons sugeridos' });
  const siteKeyNote = h('p', { class: 'note', hidden: true });
  const warnings = h('ul', { class: 'warnings' });
  const preview = h('div', { class: 'preview-body' });
  const previewSection = h('section', { class: 'preview', hidden: true, 'aria-label': 'Prévia' }, h('h2', { class: 'preview-title' }, 'Prévia'), preview);

  // `redraw: false` quando quem chama já vai redesenhar a prévia (a leitura do texto).
  function setKey(k, { fromUser = false, redraw = true } = {}) {
    key = k;
    if (fromUser) keyTouched = true;
    keyPicker.value = formatKey(key);
    keyPicker.hidden = false;
    for (const chip of suggestions.children) chip.classList.toggle('chip-active', chip.dataset.key === formatKey(key));
    if (redraw) body?.update({ originalKey: key, currentKey: key });
    refreshSounding();
  }

  function refreshSounding() {
    const n = clampCapo(capo.value);
    soundingNote.textContent = key && n ? `Com capo ${n}, a música soa em ${formatKey(transposeKey(key, n))}.` : '';
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(read, 250);
  }

  function read() {
    const text = textarea.value;
    if (!text.trim()) {
      parsed = null;
      previewSection.hidden = true;
      return;
    }
    parsed = parseSong(text);
    const { meta } = parsed;
    if (meta.title && !title.value) title.value = meta.title;
    if (meta.artist && !artist.value) artist.value = meta.artist;
    if (meta.capo !== null) capo.value = String(meta.capo);

    const ranking = rankKeys(songChords(parsed)).slice(0, 3);
    suggestions.replaceChildren(
      ...ranking.map((r) => h('button', { type: 'button', class: 'chip chip-button', dataset: { key: r.name }, onclick: () => setKey(r.key, { fromUser: true }) }, r.name)),
    );
    setKey(!keyTouched || !key ? (ranking[0]?.key ?? meta.siteKey ?? { tonic: 'C', mode: 'major' }) : key, { redraw: false });

    const siteDiffers = meta.siteKey && ranking[0] && formatKey(meta.siteKey) !== ranking[0].name;
    siteKeyNote.hidden = !siteDiffers;
    if (siteDiffers) {
      siteKeyNote.textContent = `O site indica "Tom: ${formatKey(meta.siteKey)}", mas os acordes escritos sugerem ${ranking[0].name}. O site costuma informar o tom da gravação (afinação ou capo diferentes).`;
    }

    warnings.replaceChildren(...parsed.warnings.map((w) => h('li', {}, (WARNING_TEXT[w.type] ?? ((x) => x.text))(w))));

    previewSection.hidden = false;
    const opts = { parsed, originalKey: key, currentKey: key, capo: 0, notation: settings.chordNotation, simplify: false, layoutMode: settings.layoutMode, fontSize: 16 };
    if (body) body.update(opts);
    else body = mountSongBody(preview, opts);
  }

  const fileInput = h('input', {
    type: 'file',
    accept: '.txt,text/plain',
    hidden: true,
    onchange: async () => {
      const file = fileInput.files[0];
      if (!file) return;
      textarea.value = await file.text();
      read();
    },
  });

  async function save() {
    if (!parsed) {
      toast('Cole o texto da cifra primeiro.', { error: true });
      return;
    }
    try {
      const song = createSong({ source: textarea.value, title: title.value, artist: artist.value, writtenKey: key, sourceCapo: capo.value });
      await saveSong(song);
      toast('Música salva.');
      navigate(songHash(song.id));
    } catch (err) {
      toast(err.message, { error: true });
    }
  }

  const field = (label, forId, control) => h('div', { class: 'field' }, h('label', { for: forId }, label), control);

  container.replaceChildren(
    h(
      'div',
      { class: 'page page-import' },
      h('header', { class: 'page-header' }, h('a', { class: 'icon-button', href: '#/', 'aria-label': 'Voltar' }, icon('back')), h('h1', {}, 'Importar cifra')),
      h(
        'div',
        { class: 'import-grid' },
        h(
          'div',
          { class: 'import-form' },
          h('div', { class: 'row' }, h('button', { class: 'button', type: 'button', onclick: () => fileInput.click() }, icon('import'), 'Abrir arquivo .txt'), fileInput),
          textarea,
          field('Título', 'imp-title', title),
          field('Artista', 'imp-artist', artist),
          h('div', { class: 'row fields-inline' }, field('Tom dos acordes', 'imp-key', keyPicker), field('Capo indicado', 'imp-capo', capo)),
          soundingNote,
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Tons mais prováveis'), suggestions),
          siteKeyNote,
          warnings,
          h('button', { class: 'button button-primary button-block', type: 'button', onclick: save }, 'Salvar na biblioteca'),
        ),
        previewSection,
      ),
    ),
  );
  textarea.focus();
  return () => body?.destroy();
}
