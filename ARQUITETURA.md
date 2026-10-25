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
- Manifest (`manifest.webmanifest`) e Service Worker (`sw.js`) com cache do app inteiro e versão por hash do conteúdo
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
├── manifest.webmanifest   # nome, ícones, standalone, atalhos (Repertórios, Importar)
├── sw.js                  # cache do app; lista e versão geradas por scripts/precache.mjs
├── vercel.json            # sw.js sem cache HTTP
├── scripts/
│   └── precache.mjs       # gera a lista de arquivos e a versão (hash) dentro do sw.js
├── css/
│   ├── tokens.css          # cores, espaçamento, fontes, tema, breakpoints
│   ├── base.css
│   ├── layout.css          # celular / tablet / laptop
│   └── components.css
├── js/
│   ├── main.js             # bootstrap: tema, router, store, storage.persist(), SW
│   ├── pwa.js              # registro do SW, aviso de nova versão, botão de instalar
│   ├── router.js           # rotas por hash (#/, #/importar, #/musica/:id, #/musica/:id/editar, ...)
│   ├── store.js            # estado global com pub/sub
│   ├── theory/
│   │   ├── notes.js        # notas, enarmonia, nomes latino e americano
│   │   ├── intervals.js
│   │   ├── chords.js       # parse de acorde: notação BR e americana, baixo
│   │   ├── notation.js     # exibição: tom, capo e formas (viewKeys), notação e simplificação
│   │   ├── scales.js       # maior, menor natural, harmônica e melódica
│   │   ├── harmony.js      # campo harmônico, graus, funções, dominantes secundárias,
│   │   │                   # empréstimo modal, substituições, tabela de caráter e dicas
│   │   ├── keyDetect.js    # inferência do tom a partir dos acordes
│   │   └── transpose.js    # transposição e grafia pela armadura
│   ├── chordlib/
│   │   ├── shapes.js       # formas abertas e com baixo, digitadas à mão
│   │   └── lookup.js       # pestanas geradas (formas de E e de A), busca e aproximação
│   ├── setlists/
│   │   └── model.js        # repertório: adicionar, mover, tom/capo por item (funções puras)
│   ├── songs/
│   │   ├── parser.js       # texto bruto -> modelo convertido (não persistido)
│   │   └── model.js        # criação e validação do registro da música
│   ├── storage/
│   │   ├── db.js           # abertura e migrações
│   │   ├── songs.repo.js
│   │   ├── setlists.repo.js
│   │   ├── settings.repo.js
│   │   ├── backup.js       # exportar/importar JSON
│   │   └── patchSaver.js   # junta mudanças seguidas em uma gravação
│   ├── audio/
│   │   ├── context.js      # um AudioContext, liberado no gesto do usuário (iOS)
│   │   ├── synth.js        # Karplus-Strong e frequências da forma (funções puras)
│   │   ├── chordPlayer.js  # toca a forma como rasgueado
│   │   ├── metronome.js    # agendamento adiantado, tap tempo
│   │   ├── pitch.js        # afinador: frequência (YIN), nota, corda mais próxima (funções puras)
│   │   └── mic.js          # microfone sem filtros de voz, para o afinador
│   ├── stage/
│   │   └── paging.js       # páginas em colunas e velocidade da rolagem (funções puras)
│   ├── ui/
│   │   ├── dom.js          # h(), ícones, toast (texto sempre via textContent)
│   │   ├── dialog.js       # <dialog> nativo
│   │   ├── keySelect.js
│   │   ├── controls.js     # stepper, A−/A+, página de não encontrado
│   │   ├── chordDiagram.js # diagrama em SVG
│   │   └── metronomePanel.js # metrônomo único do app + painel
│   └── views/
│       ├── library.js      # lista, busca, exportar/importar backup
│       ├── song.js         # cifra, transposição, capo, fonte, simplificar; também dentro do repertório
│       ├── songBody.js     # monta a cifra e escolhe o modo pela largura
│       ├── songContext.js  # música aberta pela biblioteca ou pelo repertório, e onde salvar tom e capo
│       ├── render/
│       │   ├── index.js    # seções e blocos comuns; escolha do modo
│       │   ├── layout.js   # colunas e palavras, sem DOM (testado)
│       │   ├── monospace.js
│       │   └── segments.js
│       ├── chordInfo.js    # card rápido e detalhe do acorde (diagrama + análise)
│       ├── editor.js       # textarea sobre o texto bruto
│       ├── importer.js     # colar / .txt -> prévia com tom sugerido e avisos
│       ├── setlists.js     # lista de repertórios e edição de um repertório
│       ├── stage.js        # páginas + rolagem, wake lock, tela cheia, atalhos
│       ├── chordPopup.js   # abre o card do acorde (tela da música e palco)
│       ├── settings.js     # tema, notação, nomes das notas, exibição, instalar, armazenamento
│       └── tuner.js        # afinador: nota, ponteiro de cents, seis cordas, referência do Lá
├── tests/
│   ├── notes.test.js
│   ├── chords.test.js
│   ├── harmony.test.js
│   ├── chordlib.test.js    # cada forma toca só notas do acorde
│   ├── keyDetect.test.js
│   ├── transpose.test.js
│   ├── parser.test.js
│   ├── ui-logic.test.js    # viewKeys, layout, backup, modelo, rotas
│   ├── setlists.test.js
│   ├── audio.test.js       # síntese, frequências, agendamento do metrônomo
│   ├── pitch.test.js       # afinador: senoides, harmônicos, corda sintetizada, silêncio e ruído
│   ├── stage.test.js
│   └── fixtures/           # trechos de cifras reais coladas de sites
└── assets/
    └── icons/             # icon.svg e maskable.svg (fonte) + PNGs 192, 512, maskable 512, apple-touch 180
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
  originalKey: { tonic: "C", mode: "major" },  // tom que soa no original; mode: major | minor
  currentKey:  { tonic: "C", mode: "major" },  // tom que soa agora (transposição)
  capo: 0,                                     // capo escolhido na tela
  sourceCapo: 0,                               // capo indicado no texto ("CAPO 1")
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
    // id próprio: a mesma música pode entrar duas vezes, com tons diferentes.
    // key é o tom que soa (como currentKey). Não altera a música da biblioteca.
    { id: "uuid", songId: "uuid", key: { tonic: "D", mode: "major" }, capo: 2 }
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
  layoutMode: "auto",              // auto | mono (colunas fixas) | segments (ajustar à tela)
  stageMode: "pages",              // pages | scroll
  stageFontSize: 24,
  metronome: { bpm: 80, beatsPerBar: 4 },
  tunerA4: 440,                    // referência do afinador (430 a 450 Hz)
  installHintDismissed: false
}
```

Índices: `songs` por `title` e `updatedAt`; `setlists` por `updatedAt`.

**Som e forma com capo:**

- `originalKey` e `currentKey` são tons que **soam**.
- Os acordes escritos no texto estão em `originalKey - sourceCapo`. Uma cifra com `CAPO 1` e acordes em E soa em F.
- As formas exibidas estão em `currentKey - capo` (tom G com capo 2 → formas de F).
- Deslocamento aplicado aos acordes escritos: `(currentKey - originalKey) - capo + sourceCapo` (`viewKeys` em `notation.js`).
- A análise harmônica sempre usa o tom que soa.

Na importação, o tom escolhido é o dos acordes escritos, e o capo vem do texto. O editor corrige os dois sem perder a transposição nem o capo escolhidos na tela.

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
        { type: "sectionRef", name: "Refrão" },                 // "Refrão" solto: repita a seção
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
| Seção sem dois-pontos | `Chorus`, `Verse 1`, `(Part IV)`, `Guitar Solo` | abre seção, ou vira marcador `sectionRef` ("repita"); regra abaixo |
| Rótulo + acordes | `Intro: B7 E`, `SOLO \|: F Eb :\| 3x`, `Part II Gm C F` | bloco `chords` com `label`, sem abrir seção |
| Rótulo + texto | `TAG: We got married...` | bloco `text` com `label` |
| Repetição | `(2x)`, `(x4)`, `3x`, `(Repeat 8x)`, `( D G7/D ) (2x)` | `repeat` no bloco |
| Decoração | `\|:` `:\|` `{:` `:}` `{A` `D}` `A------` `->` | ignorada na análise, preservada na exibição |
| Acorde opcional | `(F#°7)` | `optional: true`, fora da detecção de tom |
| Acorde no meio da letra | `My (E) child`, `a-{C} round`, `[C]Tudo é` (ChordPro) | convertido em `chordLyric` |
| Acorde solto na letra | `went C7 out`, `to F Jackson` | convertido só se a linha tiver um acorde que não pode ser palavra (`C7`, `Bm`, `F#`) ou um acorde marcado; senão, aviso `bareInlineChord` |
| Tablatura | `e\|--0--`, `\|-----\|`, `G -4---5--` | bloco `tab` |
| Formas em números | `668886 -> -> x0888x` | bloco `tab` |
| Diagramas ASCII | `o\|\|\|oo` com nome acima e casa à esquerda | vão para `diagrams`, fora da cifra |
| Rodapé e créditos | `E-Chords.com`, `Por:`, `Email:`, `Contribuição:` | removidos |

Nome de seção solto (sem dois-pontos nem colchetes), seguido de linha vazia, vira marcador `sectionRef` ("↻ Refrão") quando:

- está entre parênteses, como `(solo)`; ou
- já existe uma seção com esse nome; ou
- a cifra abre seções com dois-pontos em outro lugar (quem escreve `Bridge:` usa `Chorus` solto para dizer "repita").

Nos outros casos, abre seção. Se o nome é seguido direto de conteúdo, sempre abre seção.

Acordes soltos no meio da letra:

- `A`, `E`, `Am` e `Em` nunca são convertidos: são palavras em português ou inglês.
- Uma linha só com letras soltas (`Both: C We got married`) fica como texto e gera aviso na prévia.

Nona sem sétima (`C9`, `A9`, `D9/F#`):

1. Se o site desenhou o acorde no rodapé, as notas do desenho decidem: com sétima menor é `C7(9)`, sem ela é `C(9)`.
2. Senão, decide a origem do texto: Ultimate Guitar e outros sites americanos (ou cabeçalho `Key:`) usam nona com sétima; E-Chords, Cifra Club e o padrão usam nona adicionada.
3. `C(9)` entre parênteses, `Cadd9` e `C7(9)` nunca são ambíguos.

O E-Chords usa a convenção brasileira: o `C9` de Wish You Were Here é desenhado como `x3x553` (Dó, Sol, Ré), sem Si♭.

Limitações conhecidas:

- Os diagramas do site não diferenciam corda solta de corda abafada (fica `null`). Uma sétima tocada em corda solta não aparece na conferência da nona.

## 7. Análise harmônica (regras)

Entrada: tonalidade (`{ tonic, mode }`) e acorde.

1. **Campo harmônico** da tonalidade. No modo menor, o campo combina menor natural, harmônica e melódica (ex.: em Am, `E`/`E7` é V e `G#°` é vii°). Os textos de função seguem o acorde: `D` em Am é o IV maior da melódica, `Bm` o ii da melódica.
2. **Grau e função**: I, iii, vi = tônica; ii, IV = subdominante; V, vii° = dominante. Graus em **minúsculo para acordes menores** (`I ii iii IV V vi vii°`).
3. **Fora do campo**, nesta ordem:
   - dominante secundária: acorde maior ou com 7 que resolve uma quinta abaixo num grau do campo (`A7` em C = `V7/ii`)
   - empréstimo modal do homônimo (`Bb` em C = `bVII`, `Fm` em C = `iv`)
   - senão: "fora do campo"
   - o I maior em tom menor (picarda) é empréstimo, não V/iv; com sétima (`A7` em Am) é V7/iv
4. **Acordes com baixo**: `C/E` = grau I em 1ª inversão; `C/G` = 2ª inversão; `G7/F` = 3ª inversão. Baixo fora do acorde (`D/C`) aparece como "baixo pedal / passagem". O grau vem do acorde, não do baixo.
5. **Substituições**:
   - relativo (F → Dm) e antirrelativo (F → Am), só quando estão no campo
   - para dominantes (V e dominantes secundárias): substituto trítono (G7 → Db7) e sétimo grau (G7 → B°), mesmo fora do campo
   - fora do campo, a grafia segue o intervalo a partir do acorde: o sétimo grau de A7 é `C#°` (sensível de Ré), não `Db°`
   - aviso fixo: "Confira a melodia e a condução das vozes antes de trocar."
6. **Notas do acorde** com o intervalo: Fundamental, Terça maior/menor, Quinta justa/diminuta/aumentada, Sétima, extensões.
7. **Caráter sonoro**: maior ou menor, até duas tags e barras de 0 a 5 para estabilidade e tensão (tabela abaixo).
8. **Dica rápida**: frase por grau, com o nome do acorde interpolado.
9. **Lápis do tom** na tela de detalhe: muda só a tonalidade da análise (hipótese local, útil em modulação). Não altera a música.

Tabela de caráter, tom maior (o IV segue a imagem de referência):

| Grau | Estabilidade | Tensão | Tags | Dica |
|---|---|---|---|---|
| I | 5 | 0 | Repouso, Resolução | `{X}` é a casa: tudo resolve aqui. |
| ii | 3 | 2 | Movimento, Preparação | `{X}` costuma preparar o V. |
| iii | 4 | 1 | Repouso suave, Cor | `{X}` prolonga a tônica com outra cor. |
| IV | 3 | 3 | Movimento, Preparação | `{X}` cria movimento e prepara a chegada da tensão. |
| V | 1 | 4 | Tensão, Pede resolução | `{X}` pede para voltar ao I. |
| vi | 4 | 1 | Repouso, Melancolia | `{X}` é o repouso com cara menor. |
| vii° | 0 | 5 | Tensão máxima, Instável | `{X}` resolve com força no I. |
| V7/x | 1 | 4 | Tensão, Direção | `{X}` aponta para `{alvo}`: resolva nele. |
| empréstimo | 2 | 2 | Cor, Surpresa | `{X}` vem de `{C menor}` e muda a cor da música. |
| fora do campo | 2 | 3 | Surpresa, Fora do tom | `{X}` não pertence a `{C maior}`: confira se a música mudou de tom. |

Tom menor:

| Grau | Estabilidade | Tensão | Tags | Dica |
|---|---|---|---|---|
| i | 5 | 0 | Repouso, Resolução | `{X}` é a casa: tudo resolve aqui. |
| ii° | 1 | 4 | Tensão, Preparação | `{X}` prepara o V com um tom sombrio. |
| III | 4 | 1 | Repouso suave, Luz | `{X}` é o relativo maior: um respiro claro. |
| iv | 3 | 3 | Movimento, Melancolia | `{X}` afasta da tônica com peso. |
| v | 2 | 2 | Movimento, Suave | `{X}` prepara a volta sem tensão forte. |
| V (harmônica) | 1 | 4 | Tensão, Pede resolução | `{X}` pede para voltar ao i. |
| VI | 3 | 2 | Movimento, Cor | `{X}` abre espaço e cor antes da volta. |
| VII | 2 | 3 | Movimento, Preparação | `{X}` costuma levar ao III ou de volta ao i. |
| vii° (harmônica) | 0 | 5 | Tensão máxima, Instável | `{X}` resolve com força no i. |

Os textos ficam em `theory/harmony.js` como constantes, para revisão fácil.

## 8. Detecção de tom e grafia

- **Inferência**: para cada um dos 24 tons, pontua os acordes da música:
  - acorde do campo harmônico (o bVII entra com peso menor, por causa do mixolídio do rock)
  - acorde da tônica, com bônus quando abre ou fecha uma linha
  - primeiro e último acordes da música
  - V7 → I (o V → I sem sétima conta pouco, porque I → IV em mixolídio imita uma cadência)

  A prévia mostra os 3 tons mais prováveis para você escolher. Nos trechos de teste, o primeiro colocado acerta os 8 casos sem ambiguidade. Os casos ambíguos (Cat's in the Cradle, Wish You Were Here) ficam entre os 3 primeiros.
- **"Tom:" do site**: aparece só como informação. Nas cifras de teste ele diverge dos acordes escritos em 4 de 12, porque o site informa o tom da gravação (afinação meio tom abaixo, capo). Exemplos: Folsom Prison Blues diz `F`, mas os acordes estão em `E`; The Wind Cries Mary diz `C`, mas está em `F`.
- **Grafia ao transpor**: segue a armadura do tom de destino (tons com bemol usam `Bb`, `Eb`; tons com sustenido usam `F#`, `C#`). Acordes fora do campo são grafados pelo grau (em E, `bVII` = `D`, não `C##`).
- **Tônica com enarmonia:** `F#` maior e `Eb` menor, os mais comuns no violão.

## 9. Diagramas de acorde

Cada acorde tem uma ou mais formas, alternadas com setas. As formas vêm de três lugares, nesta ordem:

1. **Formas abertas e com baixo** digitadas à mão em `chordlib/shapes.js` (C, Am, D/F#, G/B...).
2. **Pestanas geradas** em `chordlib/lookup.js` a partir de moldes móveis nas formas de E (fundamental na 6ª corda) e de A (fundamental na 5ª). Cobrem as 12 tônicas em 22 tipos: maior, menor, 7, m7, 7M, 4, 7(4), m7(b5), °7, °, +, 6, m6, 7(9), m7(9), 7(#9), 7(b9), 7M(9), (9), m(9), sus2 e 5. Os dedos seguem a pestana: casa +1 → dedo 2, casa +2 → dedos 3 e 4.
3. **Reserva**: o diagrama do site (quando a cifra trouxe um com o mesmo nome) e, por último, a forma do acorde mais simples, com aviso ("Forma de C7 (sem a 9ª, a 13ª)").

Um teste confere, nota por nota, que cada forma toca só notas do acorde e inclui a fundamental, a terça (ou a suspensão) e a sétima.

```js
F: [
  { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 6, to: 1 } },
  { frets: ['x', 'x', 3, 2, 1, 1], fingers: [null, null, 3, 2, 1, 1], barre: { fret: 1, from: 2, to: 1 } },
]
```

O diagrama mostra:

- `x` (corda abafada) e `o` (corda solta) acima do braço
- o número da casa quando `baseFret > 1`
- o número do dedo em cada bolinha
- a pestana

Quando o acorde não está na biblioteca e a cifra importada trouxe o diagrama do site, o app usa o desenho do site como reserva, com aviso de que corda solta e abafada não são diferenciadas.

Acordes com baixo têm forma própria quando cadastrada. Se não houver, usa a forma do acorde sem baixo e indica o baixo em texto. Acordes sem forma cadastrada mostram diagrama vazio com aviso. Com "Simplificar acordes" ligado, o diagrama usa a forma do acorde simplificado.

Acordes com baixo digitados: `C/E`, `C/G`, `D/F#`, `D/C`, `E/G#`, `F/A`, `G/B`, `Am/G`.

**Card e detalhe:**

- **Card:** nome, tipo, função e grau, notas, diagrama com variações e "Ver detalhes".
- **Detalhe:** notas com intervalo, campo harmônico com o acorde destacado, função, caráter, substituições, dica e o seletor da tonalidade da análise.
- **Com capo:** o card mostra a forma tocada e o acorde que soa ("forma de F7, soa como G7"); a análise usa o que soa.
- **Onde abre:** no celular, o card sobe de baixo e o detalhe ocupa a tela; no tablet, abre centralizado; no laptop, o detalhe abre num painel lateral ao lado da cifra.

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
Lista ordenada de músicas, cada uma com tom e capo próprios. Funciona assim:

- **Adicionar:** pelo seletor da tela do repertório ou pelo menu da música ("Adicionar ao repertório"). O item entra com o tom e o capo atuais da música.
- **Editar:** tom e capo de cada item, subir, descer, tirar, renomear, duplicar (para o culto da semana seguinte) e excluir.
- **Tocar:** "Começar" abre a primeira música. Tom e capo mudados ali ficam salvos no item, não na música. Embaixo há links para a música anterior e a próxima; no laptop, as setas ← e → também navegam.
- **Excluir uma música da biblioteca** também a tira dos repertórios.

**Modo palco**
Botão "Palco" na tela da música e "Modo palco" no repertório. O palco ocupa a tela inteira e tem:

- **Páginas:** a cifra flui em colunas da altura da tela; duas colunas lado a lado em telas a partir de 900 px. Nada se parte no meio entre colunas (par acorde+letra, tablatura). Avança-se tocando na borda direita (30% da largura), arrastando para o lado, pelas setas ou por um pedal que mande PageDown. No fim da última página, "próxima" leva à música seguinte do repertório.
- **Rolagem:** automática, com velocidade de 1 a 10 (12 a 44 px/s), salva na música (`scrollSpeed`) e ajustável ao vivo; para sozinha no fim.
- **Tela sempre acesa** (Wake Lock), renovada quando o app volta ao primeiro plano; sem suporte, um aviso pede para aumentar o bloqueio automático do aparelho.
- **Tela cheia** quando o navegador permite (o iPhone não permite em páginas).
- **Tom e tamanho da letra** ajustáveis no palco; no repertório, o tom fica salvo no item.
- **Metrônomo** com o `bpm` da música.
- **Acorde:** tocar no acorde abre o card, como na tela da música.

Atalhos de teclado no palco:

| Tecla | Ação |
|---|---|
| → ↓ PageDown | próxima página (na rolagem: desce uma tela) |
| ← ↑ PageUp | página anterior |
| Espaço | próxima página; na rolagem, rolar/pausar |
| + / − | meio tom acima / abaixo |
| F | tela cheia |
| M | metrônomo liga/desliga |
| N / P | próxima / anterior música do repertório |
| Esc | sair do palco |

**Metrônomo**
Botão na tela da música e no palco. Andamento de 30 a 260 bpm (−5, −1, +1, +5 e controle deslizante), tap tempo, 2/3/4/6 batidas por compasso com a primeira acentuada, e luz da batida. O andamento fica salvo na música (`bpm`). Ao sair da tela, ele para. O agendamento é adiantado: o timer acorda a cada 25 ms e marca no relógio do áudio as batidas dos próximos 120 ms, então atrasos do timer não atrasam o som.

**Som do acorde**
Botão "Ouvir" no diagrama: toca a forma mostrada como rasgueado (da corda grave para a aguda, 30 ms entre cordas), com o capo somado. O som é sintetizado por Karplus-Strong (ruído numa linha de atraso do tamanho do período, filtrada a cada volta), sem arquivos de áudio.

**Instalar e usar sem internet**

- **Primeiro acesso:** o Service Worker guarda todos os arquivos do app no cache. Daí em diante, tudo abre sem internet: biblioteca, música, acordes, palco e ajustes.
- **Cache:** é cache-first, só da própria origem. Os dados do usuário ficam no IndexedDB e o cache nunca os toca.
- **Atualização:**
  - `npm run precache` grava no `sw.js` a lista de arquivos e uma versão que é o hash de todos eles (e da lógica do próprio `sw.js`). Qualquer arquivo alterado muda o `sw.js`, e o navegador percebe a versão nova.
  - Um teste (`tests/pwa.test.js`) falha se o `sw.js` estiver desatualizado, então não dá para publicar sem rodar o script.
  - A versão nova baixa os arquivos com `cache: 'reload'`, pulando o cache HTTP do navegador; sem isso, ela poderia guardar cópias velhas (o teste de atualização pegou esse caso).
  - A versão nova fica esperando. O app mostra "Nova versão disponível · Atualizar"; ao tocar, ela assume e a página recarrega uma vez. Nada muda no meio de uma música.
  - O app procura atualização ao voltar ao primeiro plano.
- **Instalar:**
  - Android e computador: botão "Instalar o app" em Ajustes, que usa o convite do navegador (`beforeinstallprompt`).
  - iPhone e iPad: instruções (Compartilhar → Adicionar à Tela de Início), em Ajustes e no aviso da biblioteca.
- **Ajustes:**
  - tema (sistema, claro, escuro; a cor da barra do navegador acompanha);
  - notação dos acordes, nomes das notas, exibição da cifra e simplificar;
  - estado do armazenamento persistente, espaço usado e versão do app.

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
| D31 | `C9` sem sétima: o diagrama do site decide; sem diagrama, decide a origem (EUA = nona com sétima, BR = nona adicionada) | Os dois padrões convivem nas cifras coladas |
| D32 | `7+` é sétima maior (convenção BR) | Idem |
| D33 | O "Tom:" do site é só informativo; o tom vem dos acordes | O site informa o tom da gravação, não o dos acordes escritos |
| D34 | Acorde solto no meio da letra é convertido só quando a linha tem um acorde que não pode ser palavra; `A`, `E`, `Am`, `Em` nunca | "A", "E" e "Em" também são palavras |
| D35 | Diagramas do site como reserva quando o acorde não está na biblioteca | Aproveita a forma que o autor da cifra pensou |
| D36 | Nome de seção solto seguido de linha vazia vira marcador de repetição nos casos da seção 6 | Em cifras de site, "Chorus" solto quase sempre quer dizer "repita o refrão" |
| D37 | O capo escrito na cifra (`sourceCapo`) é guardado à parte do capo escolhido na tela | Cifras escritas para capo ("CAPO 1" + formas de E) soam em outro tom |
| D38 | Aviso de instalação só no iPhone/iPad e só na biblioteca | O risco de o navegador apagar os dados é do Safari no iOS; na tela da música o aviso tira espaço da cifra |
| D39 | Na tela da música, a barra de navegação some no celular e no tablet | Toda a altura vai para a cifra; o botão voltar leva à biblioteca |
| D40 | Item do repertório tem id próprio | A mesma música pode entrar duas vezes, com tons diferentes |
| D41 | Excluir música da biblioteca tira a música dos repertórios | Evita itens órfãos; a confirmação avisa |
| D42 | A tela do repertório atualiza na hora e grava em fila | Cliques rápidos (tom, capo, subir) não se sobrescrevem |
| D43 | Formas em módulo JS (`shapes.js`) + pestanas geradas por moldes, no lugar de `shapes.json` com 60 a 80 formas | Cobre qualquer tônica e tipo sem digitar centenas de formas, sem `fetch` no carregamento, e cada forma é testada |
| D44 | Substituições fora do campo grafadas pelo intervalo a partir do acorde | O sétimo grau de A7 é C#° (sensível de Ré), não Db° |
| D45 | Laptop: detalhe do acorde num painel lateral fixo | Dá para ler a análise sem tirar a cifra da tela |
| D46 | Páginas do palco com colunas CSS e deslocamento por `transform` | Quebra natural sem calcular altura de linha; o scroll pararia no fim e desalinharia a última página |
| D47 | Duas colunas por tela a partir de 900 px | Tablet deitado e laptop mostram o dobro de cifra por página |
| D48 | "Próxima" no fim da última página vai para a próxima música do repertório | Um pedal só basta para o culto ou show inteiro |
| D49 | Barras do palco fixas (sem esconder sozinhas) | Esconder mudaria a altura das colunas e o número de páginas no meio da música |
| D50 | Andamento e velocidade de rolagem salvos na música; metrônomo para ao sair da tela | Cada música tem seu andamento; som que continua em outra tela confunde |
| D51 | Versão do cache = hash do conteúdo, gravada no `sw.js` por script, com teste que barra `sw.js` desatualizado | Sem bundler; mesmo assim, toda mudança chega aos aparelhos |
| D52 | Atualização só quando o usuário toca em "Atualizar" (sem `skipWaiting` automático) | Trocar o app no meio de uma música no palco seria pior que esperar |
| D53 | Instalação baixa os arquivos com `cache: 'reload'` | O cache HTTP poderia entregar arquivos velhos à versão nova |
| D54 | Tela de ajustes com tema, notação, nomes das notas, exibição e instalação | As opções existiam no código sem forma de mudar |
| D55 | Afinador com detecção YIN própria, sem biblioteca | Poucas linhas, testável sem navegador, resiste aos harmônicos do violão (não pula de oitava) |
| D56 | Microfone sem cancelamento de eco, supressão de ruído e ganho automático | Esses filtros de chamada de voz distorcem a nota |
| D57 | Ponteiro na nota cromática; texto de "aperte"/"solte" pela corda solta mais próxima | O músico vê a nota real e, ao mesmo tempo, para onde levar a corda |
| D58 | Microfone desligado ao sair da tela ou mandar o app para o fundo | O aparelho mostra o microfone em uso; deixá-lo aberto preocupa e gasta bateria |

**Fora da v1:** OCR de foto/PDF, anotações (Pencil ou texto), pedal Bluetooth, modo canhoto, modo só letra, estilo próprio para comentários, sincronização em nuvem.

## 12. Fases de implementação

**Fase 1: fatia vertical** (feita)
`notes`, `chords` (notação BR e americana), `notation`, `transpose`, `parser`, `keyDetect` com testes sobre cifras reais em `tests/fixtures/`. Tela da música com os dois renderizadores, importação por colar e `.txt`, IndexedDB e backup JSON. Biblioteca com busca, transposição, capo, editor e simplificar já entraram aqui.

**Fase 2: repertório** (feita)
Repertórios com tom e capo por música, navegação entre as músicas e duplicação.

**Fase 3: acordes e análise** (feita)
`scales`, `harmony` (testes antes da implementação), biblioteca de formas com pestanas geradas, card rápido, detalhe e layout por aparelho.

**Fase 4: palco e áudio** (feita)
Páginas e rolagem, wake lock, tela cheia, atalhos, metrônomo, `chordPlayer`, simplificar acordes.

**Fase 5: PWA final** (feita)
Manifest, Service Worker, ícones, instalação, aviso de nova versão, tela de ajustes e testes sem internet nos três tamanhos.

**Fase 6: afinador** (feita)
Afinador cromático pelo microfone (`#/afinador`, item próprio na navegação): nota e oitava, ponteiro de −50 a +50 cents, corda mais próxima da afinação padrão com "aperte"/"solte", referência do Lá de 430 a 450 Hz salva nos ajustes. Detecção YIN em `pitch.js` (testada com senoides, harmônicos e a corda sintetizada do app), sem dependências.

**Fases futuras:** OCR, pedal Bluetooth, anotações, sincronização.

## 13. Instrução inicial para o Claude Code

Começar pela Fase 1, seguindo a estrutura da seção 4. Antes de implementar o parser, reunir de 5 a 10 cifras reais coladas de sites em `tests/fixtures/` e escrever os testes a partir delas. Escrever os testes antes de implementar `harmony.js`, `transpose.js` e `keyDetect.js`. Não adicionar dependências além de `idb` e `vitest` sem perguntar antes.
