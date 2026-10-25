# cifras

PWA para consultar e tocar cifras de violão no celular, no tablet e no laptop. Funciona sem servidor: as músicas ficam no próprio aparelho (IndexedDB).

## Rodar localmente

O app usa módulos ES nativos, então precisa ser servido por HTTP (abrir o `index.html` direto do disco não funciona):

```sh
npm start   # python3 -m http.server 8080
# abra http://localhost:8080
```

Depois do primeiro acesso, ele funciona sem internet e pode ser instalado (Ajustes → Instalar o app).

## Testes

```sh
npm install
npm test
```

Os testes cobrem a teoria musical, o parser de cifras, a detecção de tom e a lógica da interface que não depende do DOM. Os trechos de cifras reais usados nos testes ficam em `tests/fixtures/`.

## Publicar

O app é estático (Vercel ou qualquer servidor com HTTPS). Antes de publicar, depois de mudar qualquer arquivo do app:

```sh
npm run precache   # atualiza a lista de arquivos e a versão dentro do sw.js
npm test           # um teste falha se o sw.js estiver desatualizado
```

Sem isso, quem já instalou o app não recebe a versão nova.

## Documentação

A arquitetura, as decisões e as fases de implementação estão em [`ARQUITETURA.md`](ARQUITETURA.md).
