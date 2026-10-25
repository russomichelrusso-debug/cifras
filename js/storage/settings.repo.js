import { get, put } from './db.js';

const KEY = 'app';

export const DEFAULT_SETTINGS = {
  theme: 'system',
  noteNaming: 'chordUS_noteLatin',
  chordNotation: 'br',
  simplifyChords: false,
  defaultFontSize: 18,
  layoutMode: 'auto', // auto | mono | segments
  stageMode: 'pages', // pages | scroll
  stageFontSize: 24,
  metronome: { bpm: 80, beatsPerBar: 4 },
  tunerA4: 440, // referência do afinador (Lá 440 Hz)
  installHintDismissed: false,
};

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...((await get('settings', KEY)) ?? {}) };
}

export async function saveSettings(settings) {
  await put('settings', settings, KEY);
  return settings;
}
