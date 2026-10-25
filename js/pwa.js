// Service Worker, aviso de nova versão e instalação do app.

import { h, icon } from './ui/dom.js';

const UPDATE_CHECK_MS = 30 * 60 * 1000;

let installEvent = null;
const installListeners = new Set();

/** Android e computador: o navegador oferece instalar; guardamos o evento para um botão do app. */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  installListeners.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  installEvent = null;
  installListeners.forEach((fn) => fn(false));
});

/** App aberto pela tela de início (instalado). */
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
// iPadOS se apresenta como Mac; o toque denuncia.
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const canInstall = () => installEvent !== null;
export function onInstallAvailable(fn) {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}

export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  installListeners.forEach((fn) => fn(false));
  return outcome === 'accepted';
}

function showUpdateBanner(worker) {
  if (document.querySelector('.update-banner')) return;
  const banner = h(
    'div',
    { class: 'update-banner', role: 'status' },
    h('span', {}, 'Nova versão disponível.'),
    h('button', { class: 'button button-small button-primary', type: 'button', onclick: () => worker.postMessage('SKIP_WAITING') }, 'Atualizar'),
    h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Depois', onclick: () => banner.remove() }, icon('close')),
  );
  document.body.append(banner);
}

/**
 * Registra o Service Worker. Quando há uma versão nova esperando, mostra o aviso;
 * "Atualizar" ativa a nova versão e a página recarrega uma vez.
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return null;
  const reg = await navigator.serviceWorker.register('./sw.js');
  const hadController = Boolean(navigator.serviceWorker.controller);

  const watch = (worker) => {
    worker.addEventListener('statechange', () => {
      // "installed" com um controlador ativo = atualização (na primeira instalação não há o que avisar)
      if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(worker);
    });
  };
  if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);
  if (reg.installing) watch(reg.installing);
  reg.addEventListener('updatefound', () => watch(reg.installing));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });

  // Procura versão nova ao voltar ao app, no máximo a cada 30 min (o navegador também procura a cada navegação).
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_MS) return;
    lastCheck = Date.now();
    reg.update().catch(() => {});
  });
  return reg;
}
