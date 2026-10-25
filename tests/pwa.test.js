import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { precacheList, swIsCurrent } from '../scripts/precache.mjs';

const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

describe('PWA', () => {
  it('sw.js está em dia com os arquivos do app (rode "npm run precache" se falhar)', () => {
    expect(swIsCurrent()).toBe(true);
  });

  it('o cache inclui o shell do app e todos os módulos', () => {
    const list = precacheList();
    for (const f of ['index.html', 'manifest.webmanifest', 'js/main.js', 'css/tokens.css', 'assets/icons/icon-192.png']) expect(list).toContain(f);
    expect(list.some((f) => f.startsWith('tests/') || f.startsWith('node_modules/'))).toBe(false);
  });

  it('manifesto instalável: nome, start_url, standalone e ícones 192, 512 e maskable', () => {
    expect(manifest).toMatchObject({ name: 'Cifras', start_url: './', display: 'standalone' });
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
    for (const icon of manifest.icons) expect(precacheList()).toContain(icon.src);
  });
});
