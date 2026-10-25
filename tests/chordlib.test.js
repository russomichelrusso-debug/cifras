import { describe, expect, it } from 'vitest';
import { lookupShapes, shapePitchClasses } from '../js/chordlib/lookup.js';
import { OPEN_SHAPES, SLASH_SHAPES } from '../js/chordlib/shapes.js';
import { parseChord } from '../js/theory/chords.js';
import { chordNotes } from '../js/theory/harmony.js';
import { mod12, pcOf } from '../js/theory/notes.js';

/** Confere que a forma toca só notas do acorde, inclui a fundamental e a terça (ou suspensão) e a sétima. */
function checkShape(name, shape) {
  const chord = parseChord(name);
  const notes = chordNotes({ ...chord, bass: null });
  const allowed = new Set(notes.map((n) => pcOf(n.name) ?? null).filter((x) => x !== null).map(mod12));
  // Bbb e outros dobrados: usa o semitom
  notes.forEach((n) => allowed.add(mod12(pcOf(chord.root) + n.semitones)));
  if (chord.bass) allowed.add(mod12(pcOf(chord.bass)));
  const played = shapePitchClasses(shape.frets);
  for (const pc of played) expect(allowed.has(pc), `${name} ${shape.frets.join('')} toca nota fora do acorde (${pc})`).toBe(true);
  const required = notes.filter((n) => /Fundamental|Terça|Quarta|Segunda maior|Sétima|Sexta/.test(n.interval)).map((n) => mod12(pcOf(chord.root) + n.semitones));
  for (const pc of required) expect(played, `${name} ${shape.frets.join('')} sem a nota ${pc}`).toContain(pc);
  if (chord.bass) expect(played[0], `${name}: baixo errado`).toBe(mod12(pcOf(chord.bass)));
  expect(shape.frets).toHaveLength(6);
}

describe('formas digitadas', () => {
  for (const [name, shapes] of Object.entries({ ...OPEN_SHAPES, ...SLASH_SHAPES })) {
    it(name, () => shapes.forEach((s) => checkShape(name, s)));
  }
});

describe('pestanas geradas', () => {
  const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const SUFFIXES = ['', 'm', '7', 'm7', '7M', '4', '7(4)', 'm7(b5)', '°7', '°', '+', '6', 'm6', '7(9)', 'm7(9)', '7(#9)', '7(b9)', '7M(9)', '(9)', 'm(9)', 'sus2', '5'];
  for (const suffix of SUFFIXES) {
    it(`todas as tônicas: X${suffix}`, () => {
      for (const root of ROOTS) {
        const name = root + suffix;
        const { shapes, approx } = lookupShapes(parseChord(name));
        expect(shapes.length, `${name} sem forma`).toBeGreaterThan(0);
        expect(approx, `${name} aproximado`).toBeNull();
        shapes.forEach((s) => checkShape(name, s));
      }
    });
  }

  it('pestana de F na 1ª casa (forma de E) e de Bm na 2ª (forma de A)', () => {
    // A pestana gerada de F é igual à digitada, então só a digitada aparece.
    const fShapes = lookupShapes(parseChord('F')).shapes.filter((s) => s.frets.join() === '1,3,3,2,1,1');
    expect(fShapes).toHaveLength(1);
    expect(fShapes[0]).toMatchObject({ fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 6, to: 1 }, baseFret: 1 });
    const gm = lookupShapes(parseChord('Gm')).shapes.find((s) => s.shape === 'E');
    expect(gm).toMatchObject({ frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 3, from: 6, to: 1 }, baseFret: 3 });
    const bm = lookupShapes(parseChord('Bm')).shapes.find((s) => s.shape === 'A');
    expect(bm).toMatchObject({ frets: ['x', 2, 4, 4, 3, 2], barre: { fret: 2, from: 5, to: 1 } });
  });

  it('casa inicial do desenho quando passa da 4ª casa', () => {
    const c = lookupShapes(parseChord('Cm')).shapes.find((s) => s.shape === 'A');
    expect(c).toMatchObject({ frets: ['x', 3, 5, 5, 4, 3], baseFret: 3 });
  });
});

describe('lookupShapes', () => {
  it('forma aberta vem antes da pestana, sem repetir', () => {
    const { shapes } = lookupShapes(parseChord('C'));
    expect(shapes[0]).toMatchObject({ frets: ['x', 3, 2, 0, 1, 0], source: 'open' });
    expect(new Set(shapes.map((s) => s.frets.join(','))).size).toBe(shapes.length);
  });

  it('enarmonia: Db usa as mesmas formas que C#', () => {
    expect(lookupShapes(parseChord('Db')).shapes.map((s) => s.frets)).toEqual(lookupShapes(parseChord('C#')).shapes.map((s) => s.frets));
  });

  it('acorde com baixo cadastrado', () => {
    const { shapes, bassNote } = lookupShapes(parseChord('D/F#'));
    expect(shapes[0].frets).toEqual([2, 'x', 0, 2, 3, 2]);
    expect(bassNote).toBeNull();
  });

  it('acorde com baixo sem forma: usa a do acorde e indica o baixo', () => {
    const { shapes, bassNote } = lookupShapes(parseChord('Bm/F#'));
    expect(shapes.length).toBeGreaterThan(0);
    expect(bassNote).toBe('F#');
  });

  it('sem forma exata: aproxima e avisa', () => {
    const r = lookupShapes(parseChord('C7(9/13)'));
    expect(r.approx).toBe('Forma de C7 (sem a 9ª, a 13ª)');
    expect(r.shapes.length).toBeGreaterThan(0);
  });

  it('diagrama do site como reserva', () => {
    const site = { name: 'Xyz', baseFret: 1, frets: [null, 3, 2, 3, 3, null] };
    const r = lookupShapes(parseChord('C7(9/13)'), { siteDiagram: site });
    expect(r.shapes[0]).toMatchObject({ source: 'site', frets: ['x', 3, 2, 3, 3, 'x'], unknownStrings: true });
  });
});
