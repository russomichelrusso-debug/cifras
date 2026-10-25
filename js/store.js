// Estado global simples com pub/sub. Hoje guarda só as configurações.

import { createPatchSaver } from './storage/patchSaver.js';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './storage/settings.repo.js';

let settings = { ...DEFAULT_SETTINGS };
const listeners = new Set();

export async function initStore() {
  settings = await getSettings();
}

export const getSettingsState = () => settings;

// Grava junto as mudanças seguidas (arrastar o andamento, A+ várias vezes); ao sair ou esconder a página grava na hora.
const saver = createPatchSaver(() => saveSettings(settings));
window.addEventListener('pagehide', () => saver.flush());
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saver.flush());

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saver.schedule({});
  listeners.forEach((fn) => fn(settings));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
