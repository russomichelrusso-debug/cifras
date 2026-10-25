// Rotas por hash: #/, #/importar, #/musica/:id, #/musica/:id/editar

const ROUTES = [
  [/^#?\/?$/, 'library'],
  [/^#\/importar$/, 'importer'],
  [/^#\/musica\/([^/]+)\/editar$/, 'editor'],
  [/^#\/musica\/([^/]+)$/, 'song'],
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
