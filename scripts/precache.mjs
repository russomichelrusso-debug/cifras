// Gera a lista de arquivos do app e a versão (hash do conteúdo) dentro do sw.js.
// Uso: node scripts/precache.mjs          (atualiza o sw.js)
//      node scripts/precache.mjs --check  (só confere; sai com erro se estiver desatualizado)

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SW = join(ROOT, 'sw.js');
const DIRS = ['css', 'js', 'assets'];
const FILES = ['index.html', 'manifest.webmanifest'];
const BLOCK_RE = /\/\/ <precache>[\s\S]*?\/\/ <\/precache>/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function precacheList() {
  const files = [...FILES.map((f) => join(ROOT, f)), ...DIRS.flatMap((d) => walk(join(ROOT, d)))];
  return files.map((f) => relative(ROOT, f).split('\\').join('/')).sort();
}

export function precacheBlock() {
  const files = precacheList();
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update(readFileSync(join(ROOT, f)));
  // O próprio sw.js (fora deste bloco) também entra: mudar a lógica do cache muda a versão.
  hash.update(readFileSync(SW, 'utf8').replace(BLOCK_RE, ''));
  const version = hash.digest('hex').slice(0, 12);
  const list = ['./', ...files.map((f) => `./${f}`)].map((f) => `  '${f}',`).join('\n');
  return `// <precache>\nconst VERSION = '${version}';\nconst PRECACHE = [\n${list}\n];\n// </precache>`;
}

export function swIsCurrent() {
  return readFileSync(SW, 'utf8').match(BLOCK_RE)?.[0] === precacheBlock();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    if (!swIsCurrent()) {
      console.error('sw.js desatualizado: rode "npm run precache".');
      process.exit(1);
    }
    console.log('sw.js em dia.');
  } else {
    writeFileSync(SW, readFileSync(SW, 'utf8').replace(BLOCK_RE, precacheBlock()));
    console.log('sw.js atualizado.');
  }
}
