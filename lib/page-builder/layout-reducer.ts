// Pure, immutable mutations of the page `layout` array.
// All functions return a new array without mutating the input.
import type { PageBlock } from '@/lib/page-builder';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function updateBlockField(
  layout: PageBlock[],
  index: number,
  name: string,
  value: unknown,
): PageBlock[] {
  return layout.map((block, i) =>
    i === index ? ({ ...block, [name]: value } as PageBlock) : block,
  );
}

export function insertBlock(
  layout: PageBlock[],
  index: number,
  block: PageBlock,
): PageBlock[] {
  const clamped = Math.max(0, Math.min(index, layout.length));
  return [...layout.slice(0, clamped), block, ...layout.slice(clamped)];
}

export function deleteBlock(layout: PageBlock[], index: number): PageBlock[] {
  return layout.filter((_, i) => i !== index);
}

export function duplicateBlock(layout: PageBlock[], index: number): PageBlock[] {
  const source = layout[index];
  if (!source) return layout;
  const copy = clone(source as PageBlock);
  return [...layout.slice(0, index + 1), copy, ...layout.slice(index + 1)];
}

export function moveBlock(layout: PageBlock[], from: number, to: number): PageBlock[] {
  if (from < 0 || from >= layout.length) return layout;
  const target = Math.max(0, Math.min(to, layout.length - 1));
  if (from === target) return layout;
  const next = [...layout];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}