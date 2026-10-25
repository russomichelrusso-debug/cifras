import { get, put } from './db.js';

const KEY = 'app';

export const DEFAULT_SETTINGS = {
  theme: 'system',
  noteNaming: 'chordUS_noteLatin',
  chordNotation: 'br',
  simplifyChords: false,
  defaultFontSize: 18,
  layoutMode: 'auto', // auto | mono | segments
  stageScrollSpeed: 2,
  showAnalysis: true,
  metronome: { bpm: 80, beatsPerBar: 4 },
  persistRequested: false,
  installHintDismissed: false,
};

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...((await get('settings', KEY)) ?? {}) };
}

export async function saveSettings(settings) {
  await put('settings', settings, KEY);
  return settings;
}
