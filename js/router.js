// Rotas por hash: #/, #/importar, #/musica/:id, #/musica/:id/editar,
// #/repertorios, #/repertorio/:id, #/repertorio/:id/item/:itemId,
// #/palco/musica/:id, #/palco/repertorio/:id/:itemId

const ROUTES = [
  [/^#?\/?$/, 'library'],
  [/^#\/importar$/, 'importer'],
  [/^#\/musica\/([^/]+)\/editar$/, 'editor'],
  [/^#\/musica\/([^/]+)$/, 'song'],
  [/^#\/repertorios$/, 'setlists'],
  [/^#\/repertorio\/([^/]+)$/, 'setlist'],
  [/^#\/repertorio\/([^/]+)\/item\/([^/]+)$/, 'setlistSong'],
  [/^#\/palco\/musica\/([^/]+)$/, 'stage'],
  [/^#\/palco\/repertorio\/([^/]+)\/([^/]+)$/, 'setlistStage'],
];

export function matchRoute(hash) {
  for (const [re, name] of ROUTES) {
    const m = re.exec(hash);
    if (m) return { name, params: m.slice(1).map(decodeURIComponent) };
  }
  return { name: 'notFound', params: [] };
}

export function startRouter(onRoute) {
  const go = () => onRoute(matchRoute(location.hash));
  window.addEventListener('hashchange', go);
  go();
}

export const navigate = (hash) => {
  location.hash = hash;
};

export const songHash = (id) => `#/musica/${encodeURIComponent(id)}`;
export const setlistHash = (id) => `#/repertorio/${encodeURIComponent(id)}`;
export const setlistSongHash = (id, itemId) => `${setlistHash(id)}/item/${encodeURIComponent(itemId)}`;
export const stageHash = (songId) => `#/palco/musica/${encodeURIComponent(songId)}`;
export const setlistStageHash = (id, itemId) => `#/palco/repertorio/${encodeURIComponent(id)}/${encodeURIComponent(itemId)}`;
