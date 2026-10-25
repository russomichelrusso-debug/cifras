// Cálculos de posição, sem DOM, usados pelos dois renderizadores.

/**
 * Reposiciona os itens de uma linha de acordes depois de trocar o texto (transposição).
 * Cada item fica na coluna original ou logo depois do anterior, com ao menos um espaço.
 * items: [{ text, col }] -> [{ ...item, col }]
 */
export function layoutChordLine(items, minCol = 0) {
  let end = minCol;
  return items.map((it, i) => {
    const col = i === 0 ? Math.max(it.col, minCol) : Math.max(it.col, end + 1);
    end = col + it.text.length;
    return { ...it, col };
  });
}

/** Junta os itens numa string monoespaçada (para medir a largura). */
export function chordLineText(items) {
  let s = '';
  for (const it of items) s = s.padEnd(it.col) + it.text;
  return s;
}

/**
 * Converte segmentos { chord, text } em palavras para o modo segmentos (celular).
 * Cada palavra é indivisível na quebra de linha; um acorde no meio da palavra fica preso à sílaba.
 * Retorna [{ pieces: [{ chord, text }] }]. Espaços viram fronteiras entre palavras.
 */
export function toWords(segments) {
  const words = [];
  let current = [];
  const flush = () => {
    if (current.length) words.push({ pieces: current });
    current = [];
  };
  for (const seg of segments) {
    let chord = seg.chord;
    if (chord !== null && (seg.text === '' || /^\s/.test(seg.text))) {
      // acorde sobre espaço ou depois do fim da letra: fica sozinho
      flush();
      words.push({ pieces: [{ chord, text: '' }] });
      chord = null;
    }
    for (const run of seg.text.match(/\s+|\S+/g) ?? []) {
      if (/^\s/.test(run)) {
        flush();
        continue;
      }
      current.push({ chord, text: run });
      chord = null;
    }
  }
  flush();
  return words;
}
