// components/page-builder/use-layout-history.ts — undo/redo state machine for the page-builder
// editor. Wraps the pure stacks in lib/page-builder/history with the React wiring EditorShell
// needs: a snapshot-before-mutation `record`, `undo`/`redo` that apply the stepped layout via
// the caller's setter, and the Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z / Ctrl+Y keyboard shortcuts.
//
// Extracted out of EditorShell so this state machine — the part of Task 2 that actually
// changed behavior — can be unit-tested with `renderHook` without mounting the full editor
// (autosave, preview iframe, assistant panel, Payload schemas, etc).
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { History } from '@/lib/page-builder/history';
import { emptyHistory, recordHistory, redoHistory, undoHistory } from '@/lib/page-builder/history';

export type UseLayoutHistoryResult = {
  record: () => void;
  undo: () => void;
  redo: () => void;
  undoAvailable: boolean;
  redoAvailable: boolean;
};

/**
 * @param layouts Current layout state, as committed by the caller.
 * @param setLayouts Setter the hook calls with the stepped-to layout on undo/redo.
 * @param onStep Optional side effect run after a successful undo/redo (EditorShell uses this
 *   to clear the selected block, since an undone/redone layout may not have a block at the
 *   previously selected index).
 */
export function useLayoutHistory<T>(
  layouts: T,
  setLayouts: (next: T) => void,
  onStep?: () => void,
): UseLayoutHistoryResult {
  // Latest committed layouts, read at mutation/undo/redo time to snapshot or restore without a
  // stale closure or re-created callbacks tied to every layout change.
  const layoutsRef = useRef(layouts);
  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  const [history, setHistory] = useState<History<T>>(() => emptyHistory());

  // Push the current layouts onto the undo stack just before a mutation is applied.
  const record = useCallback((): void => {
    setHistory((h) => recordHistory(h, layoutsRef.current));
  }, []);

  const undoAvailable = history.past.length > 0;
  const redoAvailable = history.future.length > 0;

  // Read `history` from state (not inside the setHistory updater) so setLayouts/onStep aren't
  // called while React is applying another component's state update.
  const undo = useCallback((): void => {
    const stepped = undoHistory(history, layoutsRef.current);
    if (!stepped) return;
    setHistory(stepped.history);
    setLayouts(stepped.present);
    onStep?.();
  }, [history, setLayouts, onStep]);

  const redo = useCallback((): void => {
    const stepped = redoHistory(history, layoutsRef.current);
    if (!stepped) return;
    setHistory(stepped.history);
    setLayouts(stepped.present);
    onStep?.();
  }, [history, setLayouts, onStep]);

  // Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo. Suppressed while focus is in a text
  // control so they don't fight the browser's native field-level undo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.metaKey && !e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  return { record, undo, redo, undoAvailable, redoAvailable };
}
