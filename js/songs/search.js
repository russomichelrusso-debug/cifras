// Busca por título ou artista, sem diferenciar acentos e maiúsculas.

const fold = (s) => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Prepara a lista uma vez; `filter(query)` devolve as músicas que contêm o texto. */
export function songSearch(songs) {
  const keys = songs.map((s) => [s, fold(`${s.title} ${s.artist}`)]);
  return (query) => {
    const q = fold(query);
    return keys.filter(([, key]) => key.includes(q)).map(([s]) => s);
  };
}
