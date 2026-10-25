// Editor: o texto bruto é a fonte da verdade, então editar é um textarea.

import { navigate, songHash } from '../router.js';
import { clampCapo } from '../songs/model.js';
import { getSong, saveSong } from '../storage/songs.repo.js';
import { writtenKey } from '../theory/notation.js';
import { intervalBetween, transposeKey } from '../theory/transpose.js';
import { h, icon, toast } from '../ui/dom.js';
import { keySelect } from '../ui/keySelect.js';

export async function renderEditor(container, [id]) {
  const song = await getSong(id);
  if (!song) {
    navigate('#/');
    return;
  }
  let written = writtenKey(song);
  const oldSourceCapo = song.sourceCapo ?? 0;
  const source = h('textarea', { class: 'input source-input source-input-tall', spellcheck: 'false', 'aria-label': 'Texto da cifra', value: song.source });
  const title = h('input', { class: 'input', id: 'ed-title', value: song.title });
  const artist = h('input', { class: 'input', id: 'ed-artist', value: song.artist ?? '' });
  const capo = h('input', { class: 'input input-narrow', id: 'ed-capo', type: 'number', min: '0', max: '11', value: String(oldSourceCapo) });

  async function save() {
    if (!source.value.trim() || !title.value.trim()) {
      toast('Título e cifra são obrigatórios.', { error: true });
      return;
    }
    // Corrigir o tom ou o capo da cifra mantém a transposição e o capo escolhidos na tela.
    const sourceCapo = clampCapo(capo.value);
    const originalKey = transposeKey(written, sourceCapo);
    const shift = intervalBetween(song.originalKey, song.currentKey);
    await saveSong({
      ...song,
      source: source.value,
      title: title.value.trim(),
      artist: artist.value.trim() || null,
      originalKey,
      currentKey: transposeKey(originalKey, shift),
      sourceCapo,
      capo: song.capo === oldSourceCapo ? sourceCapo : song.capo,
    });
    toast('Alterações salvas.');
    navigate(songHash(song.id));
  }

  const field = (label, forId, control) => h('div', { class: 'field' }, h('label', { for: forId }, label), control);
  container.replaceChildren(
    h(
      'div',
      { class: 'page page-editor' },
      h('header', { class: 'page-header' }, h('a', { class: 'icon-button', href: songHash(song.id), 'aria-label': 'Cancelar' }, icon('back')), h('h1', {}, 'Editar cifra')),
      field('Título', 'ed-title', title),
      field('Artista', 'ed-artist', artist),
      h('div', { class: 'row fields-inline' }, field('Tom dos acordes', 'ed-key', keySelect({ value: written, id: 'ed-key', onChange: (k) => { written = k; } })), field('Capo indicado', 'ed-capo', capo)),
      source,
      h('div', { class: 'row' }, h('button', { class: 'button button-primary', type: 'button', onclick: save }, 'Salvar'), h('a', { class: 'button', href: songHash(song.id) }, 'Cancelar')),
    ),
  );
}
