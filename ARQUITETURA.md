# Arquitetura: App de Cifras de Violão (PWA)

> Versão 2. Revisada a partir do questionário de decisões (perguntas 1 a 31). As mudanças em relação à v1 do documento estão na seção 11.

## 1. Visão geral

PWA de uso pessoal para consultar e tocar cifras de violão em **três ambientes: celular, tablet e laptop**.

Recursos da v1:

- Importar cifras colando texto de sites ou abrindo `.txt`, com detecção automática do tom
- Visualizar a cifra com letra alinhada, transpor e usar capotraste
- Repertórios (setlists) com tom e capo próprios por música
- Card rápido do acorde (diagrama, notas, função) e tela de detalhe com análise harmônica completa
- Modo palco com páginas e rolagem automática, tela sempre acesa, tela cheia e atalhos de teclado
- Metrônomo e som do acorde (síntese de corda)
- Simplificar acordes (`Am7(9)` → `Am`)
- Backup da biblioteca em JSON

Não há backend na v1. Tudo roda no navegador, com dados em IndexedDB, e o app funciona offline depois da primeira carga.

## 2. Stack e requisitos técnicos

- HTML5, CSS3 (variáveis CSS para tema claro/escuro, layout responsivo por breakpoints) e JavaScript ES2022 com módulos nativos
- Manifest (`manifest.webmanifest`) e Service Worker (`sw.js`) com cache do shell da aplicação
- IndexedDB via `idb`
- Web Audio API para metrônomo e síntese de corda (Karplus-Strong)
- Screen Wake Lock API e Fullscreen API no modo palco
- `navigator.storage.persist()` na primeira execução
- Testes unitários com Vitest para teoria musical, parser e detecção de tom
- Deploy estático na Vercel, com HTTPS
- Sem framework de UI na v1

## 3. Ambientes e layout

| | Celular (< 600px) | Tablet (600 a 1024px) | Laptop (> 1024px) |
|---|---|---|---|
| Cifra | Segmentos: acorde preso à sílaba, a linha quebra sem desalinhar | Monoespaçado, fiel ao texto | Monoespaçado, fiel ao texto |
| Toque no acorde | Card rápido em painel inferior; "Ver detalhes" abre em tela cheia | Card flutuante; detalhes em modal | Painel lateral fixo com o detalhe |
| Navegação | Barra inferior | Barra inferior | Barra lateral |
| Palco | Swipe para virar página | Swipe para virar página | Teclado: espaço, setas, `+`/`-` |

Os dois renderizadores (segmentos e monoespaçado) consomem o mesmo modelo convertido (seção 6). O modo é escolhido pela largura disponível, não pelo tipo de aparelho.

**Ponto aberto:** no tablet em retrato com fonte grande, uma linha monoespaçada pode não caber. Proposta: se a linha mais longa da música não couber, essa música cai no modo segmentos.

## 4. Estrutura de pastas

```
cifras/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   ├── tokens.css          # cores, espaçamento, fontes, tema, breakpoints
│   ├── base.css
│   ├── layout.css          # celular / tablet / laptop
│   └── components.css
├── js/
│   ├── main.js             # bootstrap: SW, router, store, storage.persist()
│   ├── router.js           # rotas por hash (#/biblioteca, #/musica/:id, #/repertorio/:id, ...)
│   ├── store.js            # estado global com pub/sub
│   ├── theory/
│   │   ├── notes.js        # notas, enarmonia, nomes latino e americano
│   │   ├── intervals.js
│   │   ├── chords.js       # parse de acorde: notação BR e americana, baixo
│   │   ├── notation.js     # exibição em notação BR (C7M, Am7(9), G4) e simplificação
│   │   ├── scales.js       # maior, menor natural, harmônica e melódica
│   │   ├── harmony.js      # campo harmônico, graus, funções, dominantes secundárias,
│   │   │                   # empréstimo modal, substituições, tabela de caráter e dicas
│   │   ├── keyDetect.js    # inferência do tom a partir dos acordes
│   │   └── transpose.js    # transposição e grafia pela armadura
│   ├── chordlib/
│   │   ├── shapes.json     # formas com variações por acorde
│   │   └── lookup.js
│   ├── songs/
│   │   ├── parser.js       # texto bruto -> modelo convertido (não persistido)
│   │   └── importer.js     # colar / .txt -> prévia com avisos e tom inferido
│   ├── storage/
│   │   ├── db.js           # abertura e migrações
│   │   ├── songs.repo.js
│   │   ├── setlists.repo.js
│   │   ├── settings.repo.js
│   │   └── backup.js       # exportar/importar JSON
│   ├── audio/
│   │   ├── metronome.js
│   │   └── chordPlayer.js  # Karplus-Strong, toca o acorde em arpejo/rasgueado
│   └── views/
│       ├── library.js
│       ├── song.js         # cifra, transposição, capo
│       ├── render/
│       │   ├── monospace.js
│       │   └── segments.js
│       ├── chordCard.js    # card rápido
│       ├── chordDetail.js  # análise completa
│       ├── editor.js       # textarea sobre o texto bruto
│       ├── importer.js
│       ├── setlists.js
│       ├── stage.js        # páginas + rolagem, wake lock, tela cheia, atalhos
│       ├── metronome.js
│       └── settings.js
├── tests/
│   ├── notes.test.js
│   ├── chords.test.js
│   ├── harmony.test.js
│   ├── keyDetect.test.js
│   ├── transpose.test.js
│   ├── parser.test.js
│   └── fixtures/           # cifras reais coladas de sites
└── assets/
    └── icons/
```

## 5. Modelo de dados (persistido)

O **texto bruto é a fonte da verdade**. O modelo estruturado é derivado na hora de exibir e nunca é salvo.

```js
// Song (store "songs")
{
  id: "uuid",
  title: "Tudo É Perda",
  artist: "Diego Rodrigues",
  source: "[Verso 1]\nC              G\nTudo é perda, a tua graça é...",  // texto bruto
  originalKey: { tonic: "C", mode: "major" },  // mode: major | minor
  currentKey:  { tonic: "C", mode: "major" },  // transposição
  capo: 0,                                     // casa do capotraste
  bpm: 72,
  scrollSpeed: null,                           // null = padrão global
  createdAt: 1730000000000,
  updatedAt: 1730000000000
}

// Setlist (store "setlists")
{
  id: "uuid",
  name: "Culto domingo 03/11",
  items: [
    { songId: "uuid", key: { tonic: "D", mode: "major" }, capo: 2 }  // não altera a música
  ],
  createdAt, updatedAt
}

// Settings (store "settings", chave única)
{
  theme: "system",                 // light | dark | system
  noteNaming: "chordUS_noteLatin", // padrão: acorde americano (F), notas latinas (Fá · Lá · Dó)
                                   // outros: americano | latino
  chordNotation: "br",             // br (C7M, Am7(9), G4) | us (Cmaj7, Am9, Gsus4)
  simplifyChords: false,
  defaultFontSize: 18,
  stageScrollSpeed: 2,
  showAnalysis: true,
  metronome: { bpm: 80, beatsPerBar: 4 },
  persistRequested: true,
  installHintDismissed: false
}
```

Índices: `songs` por `title` e `updatedAt`; `setlists` por `updatedAt`.

**Som e forma com capo:** o tom real é `currentKey`. As formas exibidas são as do tom `currentKey - capo` (ex.: tom G, capo 2 → formas de F). A análise harmônica sempre usa o tom real.

## 6. Parser (texto bruto → modelo convertido)

```js
{
  sections: [
    {
      name: "Verso 1",
      blocks: [
        { type: "chordLyric", segments: [{ chord: "C", text: "Tudo é perda, " }, { chord: "G", text: "a tua graça é" }] },
        { type: "chordsOnly", label: "Intro", chords: ["C", "G", "Am", "F"] },
        { type: "tab", lines: ["E|---0---|", "B|-1-----|"] },   // não é transposto
        { type: "repeat", times: 2 },                           // (2x), Refrão 2x
        { type: "text", text: "(só voz)" }                      // qualquer outra linha
      ]
    }
  ]
}
```

Regras:

- Linha de acordes: **todos** os tokens são acordes válidos em notação americana ou BR. Nomes latinos (Dó, Lám) **não** são aceitos na importação, para evitar confundir "Lá vem" ou "E eu" com acordes.
- Acordes aceitos: `C`, `Cm`, `C7`, `C7M`, `Cmaj7`, `C7+`, `Cm7`, `C°`, `Cdim`, `Cm7(b5)`, `C+`, `Caug`, `C4`, `Csus4`, `C9`, `Cadd9`, `C(9)`, `Am7(9)`, `E7(#9)`, `C6`, `D/F#`.
- Linha de acordes seguida de letra vira `chordLyric`, quebrada em segmentos pela coluna de cada acorde. Se o acorde passa do fim da letra, a letra é completada com espaços.
- Linha de acordes sem letra embaixo vira `chordsOnly`. Um prefixo como `Intro:` vira o rótulo.
- Linhas no formato tablatura (`E|--`, `B|--` etc.) viram `tab`.
- `[Verso 1]`, `[Refrão]` e similares abrem seção.
- `(2x)`, `2x` e `Refrão 2x` viram `repeat`.
- Qualquer outra linha vira `text`, sem estilo especial na v1.
- Tabs e espaços não separáveis são normalizados antes da conversão.

Formatos encontrados nas cifras reais (`tests/fixtures/`, trechos de cifras do E-Chords):

| Formato | Exemplo | Tratamento |
|---|---|---|
| Cabeçalho do site | `Jimi Hendrix - Angel (Chords)` | vira `meta.artist` e `meta.title` |
| Tom do site | `Tom: Em` | vira `meta.siteKey`, só informativo (ver seção 8) |
| Capotraste no texto | `CAPO 1` | vira `meta.capo` |
| Seção sublinhada | `Verse:` + `------` | abre seção |
| Seção sem dois-pontos | `Chorus`, `Verse 1`, `(Part IV)`, `Guitar Solo` | abre seção; se ficar vazia, é uma referência ("repita o refrão") |
| Rótulo + acordes | `Intro: B7 E`, `SOLO \|: F Eb :\| 3x`, `Part II Gm C F` | bloco `chords` com `label`, sem abrir seção |
| Rótulo + texto | `TAG: We got married...` | bloco `text` com `label` |
| Repetição | `(2x)`, `(x4)`, `3x`, `(Repeat 8x)`, `( D G7/D ) (2x)` | `repeat` no bloco |
| Decoração | `\|:` `:\|` `{:` `:}` `{A` `D}` `A------` `->` | ignorada na análise, preservada na exibição |
| Acorde opcional | `(F#°7)` | `optional: true`, fora da detecção de tom |
| Acorde no meio da letra | `My (E) child`, `a-{C} round`, `[C]Tudo é` (ChordPro) | convertido em `chordLyric` |
| Acorde solto na letra | `went C7 out` | **não** convertido; vira aviso `bareInlineChord` |
| Tablatura | `e\|--0--`, `\|-----\|`, `G -4---5--` | bloco `tab` |
| Formas em números | `668886 -> -> x0888x` | bloco `tab` |
| Diagramas ASCII | `o\|\|\|oo` com nome acima e casa à esquerda | vão para `diagrams`, fora da cifra |
| Rodapé e créditos | `E-Chords.com`, `Por:`, `Email:`, `Contribuição:` | removidos |

Limitações conhecidas:

- `Chorus` sozinho antes de uma estrofe nova é ambíguo: pode ser "repita o refrão" ou o início de uma seção. O parser trata como início de seção.
- Os diagramas do site não diferenciam corda solta de corda abafada (fica `null`).

## 7. Análise harmônica (regras)

Entrada: tonalidade (`{ tonic, mode }`) e acorde.

1. **Campo harmônico** da tonalidade. No modo menor, o campo combina menor natural, harmônica e melódica (ex.: em Am, `E`/`E7` é V e `G#°` é vii°).
2. **Grau e função**: I, iii, vi = tônica; ii, IV = subdominante; V, vii° = dominante. Graus em **minúsculo para acordes menores** (`I ii iii IV V vi vii°`).
3. **Fora do campo**, nesta ordem:
   - dominante secundária: acorde maior ou com 7 que resolve uma quinta abaixo num grau do campo (`A7` em C = `V7/ii`)
   - empréstimo modal do homônimo (`Bb` em C = `bVII`, `Fm` em C = `iv`)
   - senão: "fora do campo"
4. **Acordes com baixo**: `C/E` = grau I em 1ª inversão; `C/G` = 2ª inversão. Baixo fora do acorde (`D/C`) aparece como "baixo pedal / passagem".
5. **Substituições**:
   - relativo (F → Dm)
   - antirrelativo (F → Am)
   - para dominantes: substituto tritonal (G7 → Db7) e vii° (G7 → B°)
   - aviso fixo: "Confira a melodia e a condução das vozes antes de trocar."
6. **Notas do acorde** com o intervalo: Fundamental, Terça maior/menor, Quinta justa/diminuta/aumentada, Sétima, extensões.
7. **Caráter sonoro**: maior ou menor, até duas tags e barras de 0 a 5 para estabilidade e tensão (tabela abaixo).
8. **Dica rápida**: frase por grau, com o nome do acorde interpolado.
9. **Lápis do tom** na tela de detalhe: muda só a tonalidade da análise (hipótese local, útil em modulação). Não altera a música.

Tabela de caráter (proposta, para revisão):

| Grau | Estabilidade | Tensão | Tags | Dica |
|---|---|---|---|---|
| I | 5 | 0 | Repouso, Resolução | `{X}` é a casa: tudo resolve aqui. |
| ii | 3 | 2 | Movimento, Preparação | `{X}` costuma preparar o V. |
| iii | 4 | 1 | Repouso suave, Cor | `{X}` prolonga a tônica com outra cor. |
| IV | 3 | 3 | Movimento, Preparação | `{X}` cria movimento e prepara a chegada da tensão. |
| V | 1 | 4 | Tensão, Pede resolução | `{X}` pede para voltar ao I. |
| vi | 4 | 1 | Repouso, Melancolia | `{X}` é o repouso com cara menor. |
| vii° | 0 | 5 | Tensão máxima, Instável | `{X}` resolve com força no I. |
| V7/x | 1 | 4 | Tensão, Direção | `{X}` aponta para `{alvo}`. |
| empréstimo | 2 | 2 | Cor, Surpresa | `{X}` vem do tom homônimo e muda a cor. |

As tabelas ficam em `theory/harmony.js` como constantes.

## 8. Detecção de tom e grafia

- **Inferência**: para cada um dos 24 tons, pontua os acordes da música:
  - acorde do campo harmônico (o bVII entra com peso menor, por causa do mixolídio do rock)
  - acorde da tônica, com bônus quando abre ou fecha uma linha
  - primeiro e último acordes da música
  - V7 → I (o V → I sem sétima conta pouco, porque I → IV em mixolídio imita uma cadência)

  A prévia mostra os 3 tons mais prováveis para você escolher. Nos trechos de teste, o primeiro colocado acerta os 8 casos sem ambiguidade. Os casos ambíguos (Cat's in the Cradle, Wish You Were Here) ficam entre os 3 primeiros.
- **"Tom:" do site**: aparece só como informação. Nas cifras de teste ele diverge dos acordes escritos em 4 de 12, porque o site informa o tom da gravação (afinação meio tom abaixo, capo). Exemplos: Folsom Prison Blues diz `F`, mas os acordes estão em `E`; The Wind Cries Mary diz `C`, mas está em `F`.
- **Grafia ao transpor**: segue a armadura do tom de destino (tons com bemol usam `Bb`, `Eb`; tons com sustenido usam `F#`, `C#`). Acordes fora do campo são grafados pelo grau (em E, `bVII` = `D`, não `C##`).
- **Ponto aberto:** padrão entre `F#` e `Gb` (proposta: `F#` maior e `Eb` menor, que são os mais comuns no violão).

## 9. Diagramas de acorde

Cada acorde tem uma ou mais formas, alternadas com setas:

```json
"F": [
  { "frets": [1,3,3,2,1,1], "fingers": [1,3,4,2,1,1], "barre": { "fret": 1, "from": 6, "to": 1 }, "baseFret": 1 },
  { "frets": ["x","x",3,2,1,1], "fingers": [null,null,3,2,1,1], "barre": { "fret": 1, "from": 2, "to": 1 }, "baseFret": 1 }
]
```

O diagrama mostra:

- `x` (corda abafada) e `o` (corda solta) acima do braço
- o número da casa quando `baseFret > 1`
- o número do dedo em cada bolinha
- a pestana

Acordes com baixo têm forma própria quando cadastrada. Se não houver, usa a forma do acorde sem baixo e indica o baixo em texto. Acordes sem forma cadastrada mostram diagrama vazio com aviso. Com "Simplificar acordes" ligado, o diagrama usa a forma do acorde simplificado.

Escopo inicial: as tríades e tétrades mais usadas em louvor e MPB, além dos acordes com baixo mais comuns (`C/E`, `C/G`, `D/F#`, `G/B`, `A/C#`, `E/G#`, `F/A`).

## 10. Fluxos principais

**Importar**
Colar texto ou abrir `.txt` → `parser.js` converte → `keyDetect.js` sugere o tom → a prévia mostra a cifra renderizada, o tom sugerido e avisos (acordes não reconhecidos, acordes sem forma cadastrada) → você confirma → `songs.repo.js` salva o texto bruto.

**Abrir música**
O repo devolve `source` → `parser.js` converte → `transpose.js` aplica `currentKey` (e `capo`, para as formas) → o renderizador escolhido pela largura desenha.

**Tocar no acorde**
Abre o card rápido: nome, tipo ("Tríade maior"), função e grau, notas, diagrama e botão ▶ (som do acorde). "Ver detalhes" abre a análise completa. No laptop, a análise abre direto no painel lateral.

**Transpor e capo**
Altera `currentKey` ou `capo` e salva. O texto bruto não muda.

**Repertório**
Lista ordenada de músicas, cada uma com tom e capo próprios. Abrir a música pelo repertório usa esses valores, sem alterar a música. No palco, dá para avançar para a próxima música do repertório.

**Modo palco**
Tela cheia e Wake Lock. Avanço por páginas (swipe, ou setas e espaço no laptop), com rolagem automática opcional, velocidade por música (`scrollSpeed`) e ajuste ao vivo. Seção atual destacada. Metrônomo opcional com o `bpm` da música.

**Backup**
Exportar gera um `.json` com músicas, repertórios e configurações. Importar mescla por `id`, e o registro com `updatedAt` mais recente vence. Na primeira execução, o app chama `navigator.storage.persist()` e, se não estiver instalado, mostra o aviso para instalar.

## 11. Decisões registradas

| # | Decisão | Motivo |
|---|---|---|
| D1 | PWA, sem app nativo | Reaproveita a stack dos outros projetos |
| D2 | JavaScript puro, sem framework na v1 | Simplicidade |
| D3 | Análise harmônica por regras, sem IA | Previsível, testável, offline |
| D4 | Professor com IA fora da v1 | Sem custo nem chave de API antes de validar o núcleo |
| D5 | Dados locais no IndexedDB, sem login | Uso pessoal |
| D6 | Supabase só se houver necessidade de sincronização | Evita complexidade prematura |
| D7 | Transposição altera só `currentKey` | Volta ao tom original sem perda |
| D8 | Formas em JSON estático, com variações por acorde | Dados versionados, offline |
| D9 | Vitest para lógica pura | Foco nos pontos de maior risco |
| D10 | Hospedagem estática na Vercel | Sem servidor, com HTTPS |
| D11 | Entrada: acordes acima da letra | Formato dos sites de cifra |
| D12 | Padrão: acorde americano, notas latinas (configurável) | Igual à referência visual |
| D13 | Alvo: celular, tablet e laptop | Uso nos três aparelhos |
| D14 | Renderização híbrida: segmentos no celular, monoespaçado no tablet e no laptop | Fidelidade na tela grande, sem desalinhar na pequena |
| D15 | Texto bruto é a fonte da verdade | Nada se perde; o editor é um textarea |
| D16 | Capo como campo da música; análise pelo tom real | Uso real no violão |
| D17 | Aceita notação BR e americana; exibe BR | Padrão dos sites brasileiros |
| D18 | Nomes latinos só na exibição, não na importação | Evita falsos positivos ("Lá vem", "E eu") |
| D19 | Backup: JSON, `storage.persist()` e aviso para instalar | Sem backend, o Safari pode apagar os dados |
| D20 | Menor natural, harmônica e melódica | Análise correta em tons menores |
| D21 | Dominantes secundárias e empréstimo modal na v1 | Muito comuns no repertório |
| D22 | Tom inferido na importação, com confirmação | Menos digitação, sem erro silencioso |
| D23 | Grafia pela armadura do tom de destino | Leitura correta |
| D24 | Palco: páginas + rolagem, wake lock, tela cheia, atalhos | Uso ao vivo |
| D25 | Repertório com tom e capo por música | Culto e show mudam o tom sem alterar o original |
| D26 | Toque no acorde adaptado por tela | Celular: painel inferior; tablet: modal; laptop: painel lateral |
| D27 | Substituições completas (relativo, antirrelativo, tritonal, vii°) | Valor didático |
| D28 | Graus minúsculos para acordes menores | Convenção da teoria musical |
| D29 | Lápis do tom no detalhe muda só a análise | Explora modulação sem alterar a música |
| D30 | Som do acorde por síntese Karplus-Strong | Soa como corda, sem arquivos de áudio |
| D31 | `C9` sem sétima é nona adicionada (convenção BR); `C7(9)` é a nona com sétima | Padrão dos sites brasileiros (ponto aberto: sites americanos usam o contrário) |
| D32 | `7+` é sétima maior (convenção BR) | Idem |
| D33 | O "Tom:" do site é só informativo; o tom vem dos acordes | O site informa o tom da gravação, não o dos acordes escritos |
| D34 | Acorde solto no meio da letra gera aviso, não conversão | "A", "E" e "F" também são palavras |

**Fora da v1:** afinador, OCR de foto/PDF, anotações (Pencil ou texto), pedal Bluetooth, modo canhoto, modo só letra, estilo próprio para comentários, sincronização em nuvem.

## 12. Fases de implementação

**Fase 1: fatia vertical**
`notes`, `chords` (notação BR e americana), `notation`, `transpose`, `parser`, `keyDetect` com testes sobre cifras reais em `tests/fixtures/`. Tela da música com os dois renderizadores, importação por colar e `.txt`, IndexedDB e backup JSON.

**Fase 2: biblioteca, capo e repertório**
Biblioteca com busca, campo capo, repertórios.

**Fase 3: acordes e análise**
`scales`, `harmony` (testes antes da implementação), `shapes.json` com variações, card rápido, detalhe e layout por aparelho.

**Fase 4: palco e áudio**
Páginas e rolagem, wake lock, tela cheia, atalhos, metrônomo, `chordPlayer`, simplificar acordes.

**Fase 5: PWA final**
Manifest, Service Worker, ícones, aviso de instalação e testes em celular, tablet e laptop.

**Fases futuras:** afinador, OCR, pedal Bluetooth, anotações, sincronização.

## 13. Instrução inicial para o Claude Code

Começar pela Fase 1, seguindo a estrutura da seção 4. Antes de implementar o parser, reunir de 5 a 10 cifras reais coladas de sites em `tests/fixtures/` e escrever os testes a partir delas. Escrever os testes antes de implementar `harmony.js`, `transpose.js` e `keyDetect.js`. Não adicionar dependências além de `idb` e `vitest` sem perguntar antes.
