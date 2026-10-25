// Junta mudanças rápidas (toques seguidos, arrastar o controle) em uma gravação só.

/** `schedule(patch)` acumula e grava `ms` depois da última mudança; `flush()` grava na hora o que estiver pendente. */
export function createPatchSaver(save, ms = 400) {
  let pending = null;
  let timer = null;
  function flush() {
    clearTimeout(timer);
    timer = null;
    if (!pending) return undefined;
    const patch = pending;
    pending = null;
    return save(patch);
  }
  return {
    schedule(patch) {
      pending = { ...pending, ...patch };
      clearTimeout(timer);
      timer = setTimeout(flush, ms);
    },
    flush,
  };
}
