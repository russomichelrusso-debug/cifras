import { describe, expect, it } from 'vitest';
import { clampLevel, clampPage, pageCount, pageLayout, scrollPxPerSecond } from '../js/stage/paging.js';

describe('páginas do palco', () => {
  it('uma coluna no celular, duas em tela larga', () => {
    expect(pageLayout(390)).toEqual({ columns: 1, columnWidth: 390, step: 422 });
    expect(pageLayout(1000)).toEqual({ columns: 2, columnWidth: 484, step: 1032 });
  });

  it('conta as páginas pelo conteúdo', () => {
    const { step } = pageLayout(390);
    expect(pageCount(390, step)).toBe(1);
    expect(pageCount(390 + 32 + 390, step)).toBe(2);
    expect(pageCount(0, step)).toBe(1);
    // duas colunas por tela: 3 colunas ocupam 2 telas
    const wide = pageLayout(1000);
    expect(pageCount(484 * 3 + 32 * 2, wide.step)).toBe(2);
  });

  it('não passa da primeira nem da última página', () => {
    expect(clampPage(-1, 3)).toBe(0);
    expect(clampPage(5, 3)).toBe(2);
  });

  it('velocidade da rolagem', () => {
    expect(scrollPxPerSecond(2)).toBe(12);
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(99)).toBe(10);
    expect(clampLevel(undefined)).toBe(2);
  });
});
