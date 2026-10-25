# cifras

PWA para consultar e tocar cifras de violão no celular, no tablet e no laptop. Funciona sem servidor: as músicas ficam no próprio aparelho (IndexedDB).

## Rodar localmente

O app usa módulos ES nativos, então precisa ser servido por HTTP (abrir o `index.html` direto do disco não funciona):

```sh
python3 -m http.server 8080
# abra http://localhost:8080
```

## Testes

```sh
npm install
npm test
```

Os testes cobrem a teoria musical, o parser de cifras, a detecção de tom e a lógica da interface que não depende do DOM. Os trechos de cifras reais usados nos testes ficam em `tests/fixtures/`.

## Documentação

A arquitetura, as decisões e as fases de implementação estão em [`ARQUITETURA.md`](ARQUITETURA.md).
