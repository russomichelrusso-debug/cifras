// Um AudioContext só, criado e liberado dentro de um gesto do usuário (exigência do iOS).

let ctx = null;

export function audioContext() {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) throw new Error('Este navegador não toca áudio.');
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
