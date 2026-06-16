// components/page-builder/BlockToolbar.tsx
'use client';
import type { ReactElement } from 'react';

type Props = {
  index: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export default function BlockToolbar({
  index,
  count,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: Props): ReactElement {
  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1 rounded bg-white/95 p-1 shadow">
      <button type="button" disabled={index === 0} onClick={onMoveUp} aria-label="Move up">↑</button>
      <button type="button" disabled={index === count - 1} onClick={onMoveDown} aria-label="Move down">↓</button>
      <button type="button" onClick={onDuplicate} aria-label="Duplicate">⧉</button>
      <button type="button" onClick={onDelete} aria-label="Delete">🗑</button>
    </div>
  );
}