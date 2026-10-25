// Configurações: aparência, cifras e app (instalar, armazenamento, versão).

import { canInstall, isIOS, isStandalone, onInstallAvailable, promptInstall } from '../pwa.js';
import { getSettingsState, updateSettings } from '../store.js';
import { h, icon, toast } from '../ui/dom.js';

const OPTIONS = {
  theme: [['system', 'Igual ao sistema'], ['light', 'Claro'], ['dark', 'Escuro']],
  chordNotation: [['br', 'Brasileira (C7M, Am7(9), G4)'], ['us', 'Americana (Cmaj7, Am7(9), Gsus4)']],
  noteNaming: [['chordUS_noteLatin', 'Dó, Ré, Mi'], ['americano', 'C, D, E']],
  layoutMode: [['auto', 'Automático (pela largura da tela)'], ['mono', 'Colunas fixas'], ['segments', 'Ajustar à tela']],
};

function select(key, label) {
  const id = `set-${key}`;
  const el = h('select', { class: 'select', id, onchange: () => updateSettings({ [key]: el.value }) }, OPTIONS[key].map(([v, text]) => h('option', { value: v }, text)));
  el.value = getSettingsState()[key];
  return h('div', { class: 'field' }, h('label', { for: id }, label), el);
}

async function storageInfo() {
  const parts = [];
  if (navigator.storage?.persisted) parts.push((await navigator.storage.persisted()) ? 'Armazenamento persistente: sim' : 'Armazenamento persistente: não (o navegador pode apagar os dados se faltar espaço)');
  if (navigator.storage?.estimate) {
    const { usage = 0 } = await navigator.storage.estimate();
    parts.push(`Espaço usado: ${(usage / 1024 / 1024).toFixed(1)} MB`);
  }
  return parts;
}

async function appVersion() {
  if (!('caches' in window)) return null;
  const key = (await caches.keys()).find((k) => k.startsWith('cifras-'));
  return key ? key.slice('cifras-'.length) : null;
}

export async function renderSettings(container) {
  const s = getSettingsState();
  const simplify = h('input', { type: 'checkbox', checked: s.simplifyChords, onchange: () => updateSettings({ simplifyChords: simplify.checked }) });
  const install = h('div', { class: 'install-row' });

  function drawInstall() {
    if (isStandalone()) install.replaceChildren(h('p', { class: 'muted' }, 'O app está instalado.'));
    else if (canInstall()) install.replaceChildren(h('button', { class: 'button button-primary', type: 'button', onclick: async () => (await promptInstall()) && toast('App instalado.') }, icon('download'), 'Instalar o app'));
    else if (isIOS()) install.replaceChildren(h('p', {}, 'No Safari: toque em Compartilhar e depois em "Adicionar à Tela de Início".'));
    else install.replaceChildren(h('p', { class: 'muted' }, 'Para instalar, use a opção "Instalar app" do menu do navegador.'));
  }
  const offInstall = onInstallAvailable(drawInstall);
  drawInstall();

  const [info, version] = await Promise.all([storageInfo(), appVersion()]);
  const storage = h('ul', { class: 'plain-list muted small' }, info.map((t) => h('li', {}, t)));

  container.replaceChildren(
    h(
      'div',
      { class: 'page page-settings' },
      h('header', { class: 'page-header' }, h('h1', {}, 'Configurações')),
      h('section', { class: 'settings-group' }, h('h2', {}, 'Aparência'), select('theme', 'Tema')),
      h(
        'section',
        { class: 'settings-group' },
        h('h2', {}, 'Cifras'),
        select('chordNotation', 'Notação dos acordes'),
        select('noteNaming', 'Nomes das notas (no card do acorde)'),
        select('layoutMode', 'Exibição da cifra'),
        h('label', { class: 'toggle' }, simplify, 'Simplificar acordes (Am7(9) vira Am)'),
      ),
      h(
        'section',
        { class: 'settings-group' },
        h('h2', {}, 'App'),
        install,
        storage,
        h('p', { class: 'muted small' }, 'Funciona sem internet depois do primeiro acesso. As músicas ficam só neste aparelho: exporte um backup na Biblioteca de vez em quando.'),
        version ? h('p', { class: 'muted small' }, `Versão ${version}`) : null,
      ),
    ),
  );
  return offInstall;
}
