import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSegments, parseSong, readChordLine, songChords } from '../js/songs/parser.js';
import { formatKey } from '../js/theory/transpose.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}.txt`, import.meta.url), 'utf8');
const parse = (name) => parseSong(fixture(name));
const blocks = (song) => song.sections.flatMap((s) => s.blocks);
const chordNames = (block) => block.items.filter((i) => i.kind === 'chord').map((i) => i.text);
const sectionNames = (song) => song.sections.map((s) => s.name);

describe('readChordLine', () => {
  it('aceita linha só de acordes e guarda a coluna', () => {
    const r = readChordLine('F         C6                      Gm');
    expect(r.items.map((i) => [i.text, i.col])).toEqual([['F', 0], ['C6', 10], ['Gm', 34]]);
  });

  it('rejeita letra comum, mesmo começando com palavra que parece acorde', () => {
    expect(readChordLine('A broom is drearily sweeping')).toBeNull();
    expect(readChordLine('E eu te adoro')).toBeNull();
  });

  it('lê rótulo, barras de repetição e quantidade', () => {
    const r = readChordLine('SOLO  |: F  Eb  Bb  Ab :| 3x    G  Bb  Db  F');
    expect(r.label).toBe('SOLO');
    expect(r.repeat).toBe(3);
    expect(r.items.filter((i) => i.kind === 'deco').map((i) => i.text)).toEqual(['|:', ':|']);
  });

  it.each([
    ['Intro: Am C Dsus2 (2x)', 'Intro', 2],
    ['Intro (Solo): Em  G  Em', 'Intro (Solo)', null],
    ['Part II Guitar Solo Gm Gm6', 'Part II Guitar Solo', null],
    ['{: B   A E :} (Repeat 8x)', null, 8],
    ['A      G D  (10x)', null, 10],
    ['{: A   G D :} (x4)', null, 4],
  ])('%j', (line, label, repeat) => {
    const r = readChordLine(line);
    expect(r.label).toBe(label);
    expect(r.repeat).toBe(repeat);
  });

  it('aceita acorde grudado em decoração', () => {
    expect(chordNames(readChordLine('{A    G  D} 4x'))).toEqual(['A', 'G', 'D']);
    expect(chordNames(readChordLine('A  A  A------ A'))).toEqual(['A', 'A', 'A', 'A']);
  });

  it('marca acorde entre parênteses como opcional', () => {
    const r = readChordLine('F      (F#°7)');
    expect(r.items[1]).toMatchObject({ text: '(F#°7)', optional: true });
  });
});

describe('buildSegments', () => {
  it('divide a letra pela coluna dos acordes', () => {
    const { items } = readChordLine('C              G');
    expect(buildSegments(items, 'Tudo é perda, a tua graça é')).toEqual([
      { chord: 'C', text: 'Tudo é perda, a' },
      { chord: 'G', text: ' tua graça é' },
    ]);
  });

  it('acorde depois do fim da letra fica com texto vazio', () => {
    const { items } = readChordLine('  E                 E7');
    expect(buildSegments(items, 'I hear')).toEqual([
      { chord: null, text: 'I ' },
      { chord: 'E', text: 'hear' },
      { chord: 'E7', text: '' },
    ]);
  });
});

describe('cabeçalho e metadados', () => {
  it('lê artista, título e o tom indicado pelo site', () => {
    const { meta } = parse('little-wing');
    expect(meta).toMatchObject({ artist: 'Jimi Hendrix', title: 'Little Wing', capo: null });
    expect(formatKey(meta.siteKey)).toBe('Em');
  });

  it('lê o capotraste', () => {
    expect(parse('walk-the-line').meta.capo).toBe(1);
  });

  it('remove rodapé do site e linhas de contato', () => {
    const song = parse('wind-cries-mary');
    const text = JSON.stringify(song.sections);
    expect(text).not.toMatch(/E-Chords|example\.com|Contribuição|Por:/);
  });
});

describe('diagramas ASCII do site', () => {
  it('são separados da cifra e convertidos em casas', () => {
    const song = parse('wind-cries-mary');
    expect(song.diagrams.map((d) => d.name)).toEqual(['Eb', 'E', 'F', 'C', 'Bb', 'G', 'Ab', 'Db']);
    expect(song.diagrams[0]).toEqual({ name: 'Eb', baseFret: 3, frets: [null, 6, 5, 3, 4, 3] });
    expect(song.diagrams[2]).toEqual({ name: 'F', baseFret: 1, frets: [1, 3, 3, 2, 1, 1] });
    // a linha de nomes dos diagramas não vira linha de acordes da música
    expect(songChords(song).length).toBe(blocks(song).flatMap((b) => b.items ?? []).filter((i) => i.kind === 'chord').length);
  });

  it('corda sem marca fica null (o formato não diferencia solta de abafada)', () => {
    const e = parse('cats-in-the-cradle').diagrams.find((d) => d.name === 'E');
    expect(e.frets).toEqual([null, 2, 2, 1, null, null]);
  });
});

describe('seções', () => {
  it('"Verse:" sublinhado com traços', () => {
    expect(sectionNames(parse('angel'))).toEqual(['Verse']);
  });

  it('"Verse 1:", "Refrain:" e "Refrain" sem dois-pontos', () => {
    expect(sectionNames(parse('wont-get-fooled-again'))).toEqual([null, 'Verse 1', 'Refrain', 'Refrain']);
  });

  it('"(Part IV)" entre parênteses e "Instrumental"', () => {
    expect(sectionNames(parse('shine-on'))).toEqual(['Instrumental', 'Part IV']);
  });

  it('"Chorus" solto seguido de linha vazia vira marcador de repetição', () => {
    // Cat's in the Cradle abre seções com dois-pontos ("Bridge:"), então "Chorus" solto é "repita".
    const song = parse('cats-in-the-cradle');
    expect(sectionNames(song)).toEqual([null, 'Bridge']);
    expect(blocks(song).filter((b) => b.type === 'sectionRef').map((b) => b.name)).toEqual(['Chorus', '2nd Chorus']);
  });

  it('"(solo)" entre parênteses seguido de linha vazia vira marcador', () => {
    // Folsom Prison Blues
    const song = parseSong('  E\nI hear the train\n\n(solo)\n\n  E\nI bet there\'s rich folk');
    expect(sectionNames(song)).toEqual([null]);
    expect(blocks(song).map((b) => b.type)).toEqual(['chordLyric', 'blank', 'sectionRef', 'blank', 'chordLyric']);
  });

  it('nome solto seguido de conteúdo abre seção, mesmo repetido', () => {
    // "Refrain" (sem dois-pontos) em The Who é seguido direto pelos acordes
    expect(sectionNames(parse('wont-get-fooled-again'))).toContain('Refrain');
  });

  it('nome solto abre seção quando a cifra não usa dois-pontos', () => {
    expect(sectionNames(parse('walk-the-line'))).toEqual(['Intro', 'Verse 2']);
  });

  it('rótulo na mesma linha dos acordes não abre seção', () => {
    const song = parse('folsom-prison-blues');
    expect(blocks(song)[0]).toMatchObject({ type: 'chords', label: 'Intro' });
    expect(chordNames(blocks(song)[0])).toEqual(['B7', 'E']);
  });
});

describe('linhas de acorde + letra', () => {
  it('acordes acima da letra viram chordLyric', () => {
    const b = blocks(parse('little-wing')).find((x) => x.type === 'chordLyric');
    expect(chordNames(b)).toEqual(['Em', 'G']);
    expect(b.lyric).toBe("Well, she's walkin' through the clouds");
  });

  it('acorde depois do fim da letra (Folsom)', () => {
    const b = blocks(parse('folsom-prison-blues')).find((x) => x.lyric?.startsWith("I ain't seen"));
    expect(chordNames(b)).toEqual(['E7']);
    expect(b.items[0].col).toBeGreaterThan(b.lyric.length);
  });

  it('linha de acordes seguida de linha vazia vira linha só de acordes', () => {
    const b = blocks(parse('walk-the-line')).filter((x) => x.type === 'chords');
    expect(b.map(chordNames)).toEqual([['A']]);
  });
});

describe('acordes no meio da letra', () => {
  it('"My (E) child" vira chordLyric com a letra limpa', () => {
    const b = blocks(parse('cats-in-the-cradle'))[0];
    expect(b.type).toBe('chordLyric');
    expect(b.lyric).toBe('My child arrived the other day,');
    expect(b.items.map((i) => [i.text, i.col])).toEqual([['E', 3], ['G', 21]]);
  });

  it('aceita espaço dentro dos parênteses: "(Bm/F )"', () => {
    const b = blocks(parse('cats-in-the-cradle')).find((x) => x.lyric?.startsWith("He'd grown up"));
    expect(chordNames(b)).toContain('Bm/F');
  });

  it('"{C}" entre chaves, junto com acorde solto na mesma linha', () => {
    const b = blocks(parse('jackson')).find((x) => x.line === 7);
    expect(b.lyric).toBe("John: I'm goin' to Jackson, I'm gonna mess a- round");
    expect(b.items.map((i) => [i.text, i.col])).toEqual([['F', 19], ['C', 45]]);
  });

  it('acordes soltos são convertidos quando a linha tem um que não pode ser palavra', () => {
    const song = parse('jackson');
    const line6 = blocks(song).find((b) => b.line === 6);
    expect(line6.lyric).toBe("Both: We've been talkin' 'bout Jackson, ever since the fire went out");
    expect(chordNames(line6)).toEqual(['C7']);
    expect(chordNames(blocks(song).find((b) => b.line === 8))).toEqual(['F', 'G7', 'C']);
  });

  it('só letra solta ("Both: C We got") fica como texto, com aviso', () => {
    const song = parse('jackson');
    expect(blocks(song).find((b) => b.line === 5).type).toBe('text');
    expect(song.warnings.filter((w) => w.type === 'bareInlineChord')).toEqual([{ line: 5, type: 'bareInlineChord', text: 'C' }]);
  });

  it('nunca converte "A", "E", "Am" e "Em", que são palavras', () => {
    const b = blocks(parseSong('E agora C7 Am vem'))[0];
    expect(chordNames(b)).toEqual(['C7']);
    expect(b.lyric).toBe('E agora Am vem');
  });

  it('texto entre parênteses que não é acorde fica no texto', () => {
    expect(blocks(parse('jackson')).some((b) => b.text === 'June: (Hah!)')).toBe(true);
  });
});

describe('tablatura', () => {
  it('formato "e|---" com e sem nome da corda, e "|---|"', () => {
    expect(blocks(parse('walk-the-line')).filter((b) => b.type === 'tab').map((b) => b.lines.length)).toEqual([6, 6, 6]);
    expect(blocks(parse('folsom-prison-blues')).find((b) => b.type === 'tab').lines).toHaveLength(6);
  });

  it('formato "G -4---5---7--" sem barra', () => {
    expect(blocks(parse('fearless')).find((b) => b.type === 'tab').lines).toHaveLength(6);
  });

  it('linha de formas "668886 -> ->" fica preservada como tablatura', () => {
    const tab = blocks(parse('wind-cries-mary')).find((b) => b.type === 'tab');
    expect(tab.lines[0]).toContain('668886');
  });
});

describe('repetições', () => {
  it('"( D  G7/D ) (2x)"', () => {
    const b = blocks(parse('brain-damage')).find((x) => x.type === 'chords' && x.repeat === 2);
    expect(chordNames(b)).toEqual(['D', 'G7/D']);
  });
});

describe('robustez', () => {
  it.each(['angel', 'brain-damage', 'cats-in-the-cradle', 'fearless', 'folsom-prison-blues', 'jackson', 'little-wing',
    'shine-on', 'walk-the-line', 'wind-cries-mary', 'wish-you-were-here', 'wont-get-fooled-again'])('%s: todo acorde lido é válido', (name) => {
    const song = parse(name);
    for (const b of blocks(song)) {
      for (const it of b.items ?? []) if (it.kind === 'chord') expect(it.chord).toBeTruthy();
    }
  });

  it('normaliza CRLF, tab e espaço não separável', () => {
    const song = parseSong('C\tG\r\nTudo é perda');
    expect(blocks(song)[0]).toMatchObject({ type: 'chordLyric', lyric: 'Tudo é perda' });
    expect(blocks(song)[0].items[1].col).toBe(8);
  });

  it('aceita formato ChordPro [C]Tudo é [G]perda', () => {
    const b = blocks(parseSong('[C]Tudo é [G]perda'))[0];
    expect(b.lyric).toBe('Tudo é perda');
    expect(b.items.map((i) => [i.text, i.col])).toEqual([['C', 0], ['G', 7]]);
  });
});

describe('"C9": nona adicionada ou nona com sétima', () => {
  const ninthOf = (text) => blocks(parseSong(text)).find((b) => b.items).items[0];

  it('E-Chords e sites brasileiros: nona adicionada', () => {
    const song = parse('wind-cries-mary');
    expect(song.meta).toMatchObject({ source: 'e-chords', ninth: 'add' });
    expect(ninthOf('C9\nTudo').chord).toMatchObject({ seventh: null, tensions: ['9'] });
  });

  it('Ultimate Guitar: nona com sétima', () => {
    const it = ninthOf('C9\nTudo\n\nultimate-guitar.com');
    expect(it.chord).toMatchObject({ seventh: '7', tensions: ['9'] });
  });

  it('cabeçalho "Key:" indica site americano', () => {
    expect(parseSong('Key: C\n\nC9\nTudo').meta.ninth).toBe('dominant');
  });

  it('"(9)" entre parênteses nunca é ambíguo', () => {
    expect(ninthOf('Ultimate-Guitar\nC(9)\nTudo').chord).toMatchObject({ seventh: null });
  });

  it('o diagrama do site decide: com Sib é C7(9)', () => {
    // x3233x: Dó, Mi, Sib, Ré
    const text = 'C9\nTudo\n\n  C9\n  ||||||\n  ||o|||\n  |o|oo|\n  ||||||\n  ||||||\n';
    expect(ninthOf(text)).toMatchObject({ ninthFrom: 'diagram', chord: { seventh: '7' } });
  });

  it('o diagrama do site decide: sem Sib é Cadd9', () => {
    // x3x553 (Wish You Were Here no E-Chords): Dó, Sol, Ré
    const text = 'Ultimate-Guitar\nC9\nTudo\n\n  C9\n  ||||||\n  ||||||\n  |o||oo\n  ||||||\n  ||oo||\n';
    expect(ninthOf(text)).toMatchObject({ ninthFrom: 'diagram', chord: { seventh: null } });
  });
});
