// Contas do modo palco, sem DOM.

/** Espaço entre as colunas (páginas), em pixels. */
export const GAP = 32;

/**
 * Páginas em colunas: uma coluna por tela, ou duas quando a tela é larga (tablet deitado, laptop).
 * Retorna { columns, columnWidth, step } em pixels; `step` é quanto rolar para a próxima página.
 */
export function pageLayout(width, { gap = GAP, twoUpMin = 900 } = {}) {
  const columns = width >= twoUpMin ? 2 : 1;
  const columnWidth = Math.floor((width - gap * (columns - 1)) / columns);
  return { columns, columnWidth, step: columns * (columnWidth + gap) };
}

/** Quantidade de páginas para um conteúdo de `scrollWidth` pixels. */
export const pageCount = (scrollWidth, step, gap = GAP) => Math.max(1, Math.ceil((scrollWidth + gap - 1) / step));

export const clampPage = (page, count) => Math.min(count - 1, Math.max(0, page));

/** Velocidade da rolagem automática: nível 1 a 10 -> pixels por segundo. */
export const SCROLL_LEVELS = { min: 1, max: 10 };
export const scrollPxPerSecond = (level) => 4 + 4 * level;
export function clampLevel(n) {
  const value = n === null || n === undefined || Number.isNaN(Number(n)) ? 2 : Math.round(Number(n));
  return Math.min(SCROLL_LEVELS.max, Math.max(SCROLL_LEVELS.min, value));
}
