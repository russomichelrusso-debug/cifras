// Microfone para o afinador: um AnalyserNode que entrega o trecho de áudio mais recente.

import { audioContext } from './context.js';

const FRAME = 4096; // ~85 ms a 48 kHz: cabe mais de dois períodos do Mi grave (82 Hz)

/**
 * Abre o microfone sem cancelamento de eco, supressão de ruído nem ganho automático
 * (esses filtros de chamada de voz distorcem a nota). Chamar dentro de um toque (iOS).
 * Retorna { sampleRate, read() -> Float32Array, close() }.
 */
export async function openMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador não dá acesso ao microfone.');
  const ctx = audioContext();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FRAME;
  source.connect(analyser);
  const buffer = new Float32Array(FRAME);
  return {
    sampleRate: ctx.sampleRate,
    read() {
      analyser.getFloatTimeDomainData(buffer);
      return buffer;
    },
    close() {
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
