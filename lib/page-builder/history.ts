// lib/page-builder/history.ts — pure undo/redo stacks for the page-builder editor.
// Kept free of React so the semantics (cap, redo invalidation) are unit-testable.

export type History<T> = { past: T[]; future: T[] };

const DEFAULT_LIMIT = 50;

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [] };
}

/** Snapshot `present` onto the undo stack. A fresh edit invalidates the redo branch. */
export function recordHistory<T>(
  history: History<T>,
  present: T,
  limit: number = DEFAULT_LIMIT,
): History<T> {
  return { past: [...history.past, present].slice(-limit), future: [] };
}

/** Step back one state. Returns null at the head of history. */
export function undoHistory<T>(
  history: History<T>,
  present: T,
  limit: number = DEFAULT_LIMIT,
): { history: History<T>; present: T } | null {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return null;
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [present, ...history.future].slice(0, limit),
    },
    present: previous,
  };
}

/** Step forward one state. Returns null when nothing has been undone. */
export function redoHistory<T>(
  history: History<T>,
  present: T,
  limit: number = DEFAULT_LIMIT,
): { history: History<T>; present: T } | null {
  const next = history.future[0];
  if (next === undefined) return null;
  return {
    history: {
      past: [...history.past, present].slice(-limit),
      future: history.future.slice(1),
    },
    present: next,
  };
}
