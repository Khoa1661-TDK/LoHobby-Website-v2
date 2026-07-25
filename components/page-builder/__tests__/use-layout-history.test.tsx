// components/page-builder/__tests__/use-layout-history.test.tsx
import { describe, expect, it } from 'vitest';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { useLayoutHistory } from '@/components/page-builder/use-layout-history';

// Mirrors how EditorShell wires the hook: `layouts` is state the caller owns, and `edit`
// stands in for a real mutation (record the pre-edit snapshot, then commit the new value).
function useHarness(initial: string) {
  const [layouts, setLayouts] = useState(initial);
  const history = useLayoutHistory(layouts, setLayouts);
  const edit = useCallback(
    (next: string) => {
      history.record();
      setLayouts(next);
    },
    [history],
  );
  return { layouts, edit, ...history };
}

describe('useLayoutHistory', () => {
  it('should enable Redo after Undo, restore the edit on Redo, and disable Redo again after a fresh edit', () => {
    const { result } = renderHook(() => useHarness('A'));

    // Fresh state: nothing to undo or redo.
    expect(result.current.undoAvailable).toBe(false);
    expect(result.current.redoAvailable).toBe(false);

    // 1. An edit enables Undo; Redo stays disabled (there's no future yet).
    act(() => result.current.edit('B'));
    expect(result.current.layouts).toBe('B');
    expect(result.current.undoAvailable).toBe(true);
    expect(result.current.redoAvailable).toBe(false);

    // 2. Undo steps back and enables Redo.
    act(() => result.current.undo());
    expect(result.current.layouts).toBe('A');
    expect(result.current.undoAvailable).toBe(false);
    expect(result.current.redoAvailable).toBe(true);

    // 3. Redo restores the edit.
    act(() => result.current.redo());
    expect(result.current.layouts).toBe('B');
    expect(result.current.undoAvailable).toBe(true);
    expect(result.current.redoAvailable).toBe(false);

    // 4. A fresh edit after an undo disables Redo again (the redo branch is invalidated).
    act(() => result.current.undo());
    expect(result.current.redoAvailable).toBe(true);
    act(() => result.current.edit('C'));
    expect(result.current.layouts).toBe('C');
    expect(result.current.undoAvailable).toBe(true);
    expect(result.current.redoAvailable).toBe(false);
  });

  it('should undo/redo on Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z, but not while focus is in a text input', () => {
    const { result } = renderHook(() => useHarness('A'));
    act(() => result.current.edit('B'));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // Suppressed: focus is in a text control, so the browser's native undo should win.
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });
    expect(result.current.layouts).toBe('B');

    input.blur();
    document.body.removeChild(input);

    // Ctrl+Z outside a text control undoes...
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(result.current.layouts).toBe('A');
    expect(result.current.redoAvailable).toBe(true);

    // ...and Ctrl+Shift+Z redoes.
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(result.current.layouts).toBe('B');
    expect(result.current.redoAvailable).toBe(false);
  });
});
