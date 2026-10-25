import { describe, expect, it, vi } from 'vitest';
import { songSearch } from '../js/songs/search.js';
import { createPatchSaver } from '../js/storage/patchSaver.js';

describe('createPatchSaver', () => {
  it('junta as mudanças e grava uma vez', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createPatchSaver(save, 400);
    saver.schedule({ bpm: 80 });
    saver.schedule({ bpm: 90 });
    saver.schedule({ scrollSpeed: 3 });
    vi.advanceTimersByTime(399);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledExactlyOnceWith({ bpm: 90, scrollSpeed: 3 });
    vi.useRealTimers();
  });

  it('flush grava o pendente na hora e não grava de novo', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createPatchSaver(save);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
    saver.schedule({ capo: 2 });
    saver.flush();
    vi.runAllTimers();
    expect(save).toHaveBeenCalledExactlyOnceWith({ capo: 2 });
    vi.useRealTimers();
  });
});

describe('songSearch', () => {
  const find = songSearch([{ title: 'Canção da América', artist: 'Milton' }, { title: 'Hurt', artist: 'Johnny Cash' }]);
  it('ignora acentos e maiúsculas, busca no artista', () => {
    expect(find('cancao').map((s) => s.title)).toEqual(['Canção da América']);
    expect(find('CASH').map((s) => s.title)).toEqual(['Hurt']);
    expect(find('')).toHaveLength(2);
  });
});
