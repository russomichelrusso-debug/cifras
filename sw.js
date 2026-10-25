// Service Worker: guarda o app inteiro no primeiro acesso e serve do cache (funciona sem internet).
// Os dados do usuário ficam no IndexedDB; o cache aqui só tem os arquivos do app.
//
// A lista e a versão abaixo são geradas por `npm run precache` (scripts/precache.mjs).
// A versão é um hash do conteúdo: qualquer arquivo alterado muda este sw.js, o navegador
// percebe a atualização e o app mostra "Nova versão disponível".

// <precache>
const VERSION = 'cb245acfdacb';
const PRECACHE = [
  './',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon.svg',
  './assets/icons/maskable-512.png',
  './assets/icons/maskable.svg',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/tokens.css',
  './index.html',
  './js/audio/chordPlayer.js',
  './js/audio/context.js',
  './js/audio/metronome.js',
  './js/audio/synth.js',
  './js/chordlib/lookup.js',
  './js/chordlib/shapes.js',
  './js/main.js',
  './js/pwa.js',
  './js/router.js',
  './js/setlists/model.js',
  './js/songs/model.js',
  './js/songs/parser.js',
  './js/songs/search.js',
  './js/stage/paging.js',
  './js/storage/backup.js',
  './js/storage/db.js',
  './js/storage/patchSaver.js',
  './js/storage/setlists.repo.js',
  './js/storage/settings.repo.js',
  './js/storage/songs.repo.js',
  './js/store.js',
  './js/theory/chords.js',
  './js/theory/harmony.js',
  './js/theory/keyDetect.js',
  './js/theory/notation.js',
  './js/theory/notes.js',
  './js/theory/scales.js',
  './js/theory/transpose.js',
  './js/ui/chordDiagram.js',
  './js/ui/controls.js',
  './js/ui/dialog.js',
  './js/ui/dom.js',
  './js/ui/keySelect.js',
  './js/ui/metronomePanel.js',
  './js/views/chordInfo.js',
  './js/views/chordPopup.js',
  './js/views/editor.js',
  './js/views/importer.js',
  './js/views/library.js',
  './js/views/render/index.js',
  './js/views/render/layout.js',
  './js/views/render/monospace.js',
  './js/views/render/segments.js',
  './js/views/setlists.js',
  './js/views/settings.js',
  './js/views/song.js',
  './js/views/songBody.js',
  './js/views/songContext.js',
  './js/views/stage.js',
  './manifest.webmanifest',
];
// </precache>

const CACHE = `cifras-${VERSION}`;

self.addEventListener('install', (event) => {
  // cache: 'reload' pula o cache HTTP do navegador: senão a versão nova poderia guardar arquivos velhos.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))));
  // Sem skipWaiting aqui: a nova versão só assume quando o usuário toca em "Atualizar".
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cifras-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Rotas são por hash, então toda navegação é a página inicial.
  const key = request.mode === 'navigate' ? './' : request;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') cache.put(request, response.clone());
      return response;
    }),
  );
});
