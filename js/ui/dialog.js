// Diálogo modal com <dialog> nativo (foco, Esc e fundo cuidados pelo navegador).

import { h, icon } from './dom.js';

export function openDialog({ title, content, onClose }) {
  const dialog = h(
    'dialog',
    { class: 'dialog', 'aria-label': title },
    h('header', { class: 'dialog-header' }, h('h2', {}, title), h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Fechar', onclick: () => dialog.close() }, icon('close'))),
    h('div', { class: 'dialog-body' }, content),
  );
  // Clique fora do conteúdo fecha.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return { close: () => dialog.close(), element: dialog };
}
