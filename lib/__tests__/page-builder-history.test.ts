import { describe, expect, it } from 'vitest';
import {
  emptyHistory,
  recordHistory,
  redoHistory,
  undoHistory,
} from '@/lib/page-builder/history';

describe('page-builder history', () => {
  it('should return null when undoing with no recorded past', () => {
    expect(undoHistory(emptyHistory<string>(), 'a')).toBeNull();
  });

  it('should restore the previous state when undoing one recorded change', () => {
    const h = recordHistory(emptyHistory<string>(), 'a');
    const result = undoHistory(h, 'b');
    expect(result?.present).toBe('a');
    expect(result?.history.past).toEqual([]);
  });

  it('should restore the undone state when redoing', () => {
    const h = recordHistory(emptyHistory<string>(), 'a');
    const undone = undoHistory(h, 'b');
    const redone = redoHistory(undone!.history, undone!.present);
    expect(redone?.present).toBe('b');
    expect(redone?.history.past).toEqual(['a']);
  });

  it('should clear the redo stack when a new change is recorded after an undo', () => {
    const h = recordHistory(emptyHistory<string>(), 'a');
    const undone = undoHistory(h, 'b')!;
    expect(undone.history.future).toEqual(['b']);
    const afterEdit = recordHistory(undone.history, 'c');
    expect(afterEdit.future).toEqual([]);
    expect(redoHistory(afterEdit, 'd')).toBeNull();
  });

  it('should cap the past stack at the given limit', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 60; i += 1) h = recordHistory(h, i, 50);
    expect(h.past).toHaveLength(50);
    expect(h.past[0]).toBe(10);
    expect(h.past[49]).toBe(59);
  });

  it('should not grow the past stack past the limit across an undo/redo cycle', () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 60; i += 1) h = recordHistory(h, i, 50);
    const undone = undoHistory(h, 60)!;
    const redone = redoHistory(undone.history, undone.present)!;
    expect(redone.history.past.length).toBeLessThanOrEqual(50);
  });
});
