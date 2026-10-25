// Diálogo modal com <dialog> nativo (foco, Esc e fundo cuidados pelo navegador).

import { h, icon } from './dom.js';

/** `showTitle: false` deixa o título só para leitores de tela (o conteúdo traz o próprio cabeçalho). */
export function openDialog({ title, content, onClose, className = '', showTitle = true }) {
  const body = h('div', { class: 'dialog-body' }, content);
  const dialog = h(
    'dialog',
    { class: `dialog ${className}`.trim(), 'aria-label': title },
    h(
      'header',
      { class: `dialog-header${showTitle ? '' : ' dialog-header-bare'}` },
      showTitle ? h('h2', {}, title) : h('span', { class: 'sheet-handle', 'aria-hidden': 'true' }),
      h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Fechar', onclick: () => dialog.close() }, icon('close')),
    ),
    body,
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
  return {
    close: () => dialog.close(),
    element: dialog,
    setContent: (...nodes) => {
      body.replaceChildren(...nodes);
      body.scrollTop = 0;
    },
  };
}
