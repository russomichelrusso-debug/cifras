// Bootstrap: estado, armazenamento persistente, aviso de instalação e rotas.

import { registerServiceWorker } from './pwa.js';
import { startRouter } from './router.js';
import { getSettingsState, initStore, subscribe, updateSettings } from './store.js';
import { h, icon } from './ui/dom.js';
import { renderEditor } from './views/editor.js';
import { renderImporter } from './views/importer.js';
import { renderLibrary } from './views/library.js';
import { renderSetlist, renderSetlists } from './views/setlists.js';
import { renderSettings } from './views/settings.js';
import { renderSetlistSong, renderSong } from './views/song.js';
import { renderSetlistStage, renderStage } from './views/stage.js';

const VIEWS = {
  library: renderLibrary,
  importer: renderImporter,
  song: renderSong,
  editor: renderEditor,
  setlists: renderSetlists,
  setlist: renderSetlist,
  setlistSong: renderSetlistSong,
  stage: renderStage,
  setlistStage: renderSetlistStage,
  settings: renderSettings,
  notFound: (el) => el.replaceChildren(h('div', { class: 'page' }, h('p', {}, 'Página não encontrada.'), h('a', { class: 'button', href: '#/' }, 'Ir para a biblioteca'))),
};

const NAV = [
  ['library', '#/', 'library', 'Biblioteca'],
  ['setlists', '#/repertorios', 'list', 'Repertórios'],
  ['importer', '#/importar', 'import', 'Importar'],
  ['settings', '#/configuracoes', 'settings', 'Ajustes'],
];

// Qual item da navegação fica marcado em cada rota.
const NAV_SECTION = { setlists: 'setlists', setlist: 'setlists', setlistSong: 'setlists', setlistStage: 'setlists', importer: 'importer', settings: 'settings' };

/** Tema: "system" segue o aparelho; "light" e "dark" fixam (tokens.css lê data-theme). */
const THEME_COLOR = { light: '#f7f5f0', dark: '#16181d' };

function applyTheme({ theme }) {
  const forced = theme === 'light' || theme === 'dark';
  if (forced) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  // Cor da barra do navegador: segue o tema escolhido (ou o do sistema, pelo media de cada meta).
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.content = forced ? THEME_COLOR[theme] : THEME_COLOR[meta.media.includes('dark') ? 'dark' : 'light'];
  });
}

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
// iPadOS se apresenta como Mac; o toque denuncia.
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function requestPersistence() {
  if (!navigator.storage?.persist) return;
  if (await navigator.storage.persisted()) return;
  await navigator.storage.persist();
  updateSettings({ persistRequested: true });
}

function installHint() {
  // O risco de apagar dados é do Safari no iOS; nos outros, o aviso só atrapalha.
  if (!isIOS() || isStandalone() || getSettingsState().installHintDismissed) return null;
  const banner = h(
    'div',
    { class: 'install-hint', role: 'note' },
    h('p', {}, 'Adicione o app à tela de início (Compartilhar → Adicionar à Tela de Início). Sem isso, o Safari pode apagar suas músicas depois de alguns dias sem uso.'),
    h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Fechar aviso', onclick: () => {
      updateSettings({ installHintDismissed: true });
      banner.remove();
    } }, icon('close')),
  );
  return banner;
}

async function main() {
  await initStore();
  applyTheme(getSettingsState());
  subscribe(applyTheme);
  requestPersistence();
  registerServiceWorker().catch((err) => console.warn('Service Worker não registrado:', err));

  const view = h('main', { class: 'view', id: 'view' });
  const navLinks = NAV.map(([name, href, iconName, label]) => h('a', { class: 'nav-link', href, dataset: { route: name } }, icon(iconName), h('span', {}, label)));
  const nav = h('nav', { class: 'app-nav', 'aria-label': 'Principal' }, h('span', { class: 'app-name' }, 'Cifras'), navLinks);
  document.getElementById('app').replaceChildren(nav, h('div', { class: 'app-content' }, installHint(), view));

  let cleanup = null;
  startRouter(async ({ name, params }) => {
    cleanup?.();
    cleanup = null;
    const section = NAV_SECTION[name] ?? 'library';
    navLinks.forEach((a) => a.toggleAttribute('aria-current', a.dataset.route === section));
    document.body.dataset.route = name;
    try {
      cleanup = (await VIEWS[name](view, params)) ?? null;
    } catch (err) {
      console.error(err);
      view.replaceChildren(h('div', { class: 'page' }, h('p', { role: 'alert' }, `Erro: ${err.message}`)));
    }
    window.scrollTo(0, 0);
  });
}

main();
