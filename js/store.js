// Estado global simples com pub/sub. Hoje guarda só as configurações.

import { DEFAULT_SETTINGS, getSettings, saveSettings } from './storage/settings.repo.js';

let settings = { ...DEFAULT_SETTINGS };
const listeners = new Set();

export async function initStore() {
  settings = await getSettings();
}

export const getSettingsState = () => settings;

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  listeners.forEach((fn) => fn(settings));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
