// Abrir o acorde tocado na cifra: monta as informações e mostra o card (com o detalhe no mesmo diálogo).
// Usado pela tela da música e pelo modo palco.

import { getSettingsState } from '../store.js';
import { openDialog } from '../ui/dialog.js';
import { chordInfo, renderChordCard, renderChordDetail } from './chordInfo.js';

/**
 * Informações do acorde tocado. O primeiro argumento é o que o corpo da cifra entrega no toque
 * (`onChord`): forma tocada e acorde que soa, já com tom, capo e simplificação. O tom da análise é o que soa.
 */
export function chordInfoFor({ item, shapeChord, soundingChord, sameAsText }, { parsed, currentKey, capo }) {
  const settings = getSettingsState();
  return chordInfo({
    shapeChord,
    soundingChord,
    key: currentKey,
    capo,
    siteDiagram: sameAsText ? parsed.diagrams.find((d) => d.name === item.text) : null,
    notation: settings.chordNotation,
    noteNaming: settings.noteNaming,
  });
}

/** Um diálogo de acorde por vez; abrir outro fecha o anterior. */
export function createChordDialog() {
  let dialog = null;
  return {
    open(info) {
      dialog?.close();
      // O evento "close" chega depois: cada diálogo só limpa a referência se ainda for o atual.
      const d = openDialog({ title: `Acorde ${info.name}`, content: [], className: 'chord-dialog', showTitle: false, onClose: () => {
        if (dialog === d) dialog = null;
      } });
      dialog = d;
      const showCard = () => {
        d.element.classList.remove('is-detail');
        d.setContent(renderChordCard(info, { onDetails: () => {
          d.element.classList.add('is-detail');
          d.setContent(renderChordDetail(info, { onBack: showCard }));
        } }));
      };
      showCard();
    },
    close: () => dialog?.close(),
  };
}
