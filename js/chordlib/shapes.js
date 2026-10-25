// Formas abertas e acordes com baixo mais comuns, digitadas à mão.
// frets: da 6ª corda (Mi grave) à 1ª (Mi agudo); "x" = não tocar, 0 = solta.
// fingers: 1 indicador ... 4 mínimo; null em corda solta ou abafada.
// barre: { fret, from, to } com cordas numeradas de 6 a 1.
// As pestanas móveis (formas de E e de A) são geradas em lookup.js.

export const OPEN_SHAPES = {
  C: [{ frets: ['x', 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] }],
  C7: [{ frets: ['x', 3, 2, 3, 1, 0], fingers: [null, 3, 2, 4, 1, null] }],
  C7M: [{ frets: ['x', 3, 2, 0, 0, 0], fingers: [null, 3, 2, null, null, null] }],
  'C(9)': [{ frets: ['x', 3, 2, 0, 3, 3], fingers: [null, 2, 1, null, 3, 4] }],
  D: [{ frets: ['x', 'x', 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] }],
  Dm: [{ frets: ['x', 'x', 0, 2, 3, 1], fingers: [null, null, null, 2, 3, 1] }],
  D7: [{ frets: ['x', 'x', 0, 2, 1, 2], fingers: [null, null, null, 2, 1, 3] }],
  Dm7: [{ frets: ['x', 'x', 0, 2, 1, 1], fingers: [null, null, null, 2, 1, 1], barre: { fret: 1, from: 2, to: 1 } }],
  D7M: [{ frets: ['x', 'x', 0, 2, 2, 2], fingers: [null, null, null, 1, 2, 3] }],
  Dsus2: [{ frets: ['x', 'x', 0, 2, 3, 0], fingers: [null, null, null, 1, 3, null] }],
  D4: [{ frets: ['x', 'x', 0, 2, 3, 3], fingers: [null, null, null, 1, 3, 4] }],
  E: [{ frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] }],
  Em: [{ frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] }],
  E7: [{ frets: [0, 2, 0, 1, 0, 0], fingers: [null, 2, null, 1, null, null] }],
  Em7: [{ frets: [0, 2, 2, 0, 3, 0], fingers: [null, 1, 2, null, 3, null] }],
  E4: [{ frets: [0, 2, 2, 2, 0, 0], fingers: [null, 2, 3, 4, null, null] }],
  F: [
    { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 6, to: 1 } },
    { frets: ['x', 'x', 3, 2, 1, 1], fingers: [null, null, 3, 2, 1, 1], barre: { fret: 1, from: 2, to: 1 } },
  ],
  F7M: [{ frets: ['x', 'x', 3, 2, 1, 0], fingers: [null, null, 3, 2, 1, null] }],
  G: [
    { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] },
    { frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, null, null, 3, 4] },
  ],
  G7: [{ frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, null, null, null, 1] }],
  G7M: [{ frets: [3, 2, 0, 0, 0, 2], fingers: [3, 2, null, null, null, 1] }],
  A: [{ frets: ['x', 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] }],
  Am: [{ frets: ['x', 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] }],
  A7: [{ frets: ['x', 0, 2, 0, 2, 0], fingers: [null, null, 2, null, 3, null] }],
  Am7: [{ frets: ['x', 0, 2, 0, 1, 0], fingers: [null, null, 2, null, 1, null] }],
  A7M: [{ frets: ['x', 0, 2, 1, 2, 0], fingers: [null, null, 2, 1, 3, null] }],
  Asus2: [{ frets: ['x', 0, 2, 2, 0, 0], fingers: [null, null, 1, 2, null, null] }],
  A4: [{ frets: ['x', 0, 2, 2, 3, 0], fingers: [null, null, 1, 2, 3, null] }],
  B7: [{ frets: ['x', 2, 1, 2, 0, 2], fingers: [null, 2, 1, 3, null, 4] }],
  Bm7: [{ frets: ['x', 2, 0, 2, 0, 2], fingers: [null, 1, null, 2, null, 3] }],
};

// Acordes com baixo: a corda mais grave tocada é o baixo.
export const SLASH_SHAPES = {
  'C/E': [{ frets: [0, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] }],
  'C/G': [{ frets: [3, 3, 2, 0, 1, 0], fingers: [4, 3, 2, null, 1, null] }],
  'D/F#': [{ frets: [2, 'x', 0, 2, 3, 2], fingers: [1, null, null, 2, 4, 3] }],
  'D/C': [{ frets: ['x', 3, 0, 2, 3, 2], fingers: [null, 3, null, 1, 4, 2] }],
  'E/G#': [{ frets: [4, 'x', 2, 1, 0, 0], fingers: [4, null, 2, 1, null, null] }],
  'F/A': [{ frets: ['x', 0, 3, 2, 1, 1], fingers: [null, null, 3, 2, 1, 1], barre: { fret: 1, from: 2, to: 1 } }],
  'G/B': [{ frets: ['x', 2, 0, 0, 0, 3], fingers: [null, 1, null, null, null, 4] }],
  'Am/G': [{ frets: [3, 0, 2, 2, 1, 0], fingers: [4, null, 2, 3, 1, null] }],
};
