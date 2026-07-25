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

/** Read a block's array field as rows, tolerating an unset field (a block added without
 * its rows filled in yet has no key at all). */
function readRows(block: PageBlock, field: string): Record<string, unknown>[] {
  const value = (block as Record<string, unknown>)[field];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/** Insert a row into a block's array field. `at` defaults to the end. Rows are stored
 * without an `id` — the save path assigns those. */
export function addRow(
  layout: PageBlock[],
  index: number,
  field: string,
  row: Record<string, unknown>,
  at?: number,
): PageBlock[] {
  const block = layout[index];
  if (!block) return layout;
  const rows = readRows(block, field);
  const clamped = at === undefined ? rows.length : Math.max(0, Math.min(at, rows.length));
  const next = [...rows.slice(0, clamped), row, ...rows.slice(clamped)];
  return updateBlockField(layout, index, field, next);
}

/** Patch the named fields of one row, leaving its other fields untouched. */
export function updateRow(
  layout: PageBlock[],
  index: number,
  field: string,
  rowIndex: number,
  values: Record<string, unknown>,
): PageBlock[] {
  const block = layout[index];
  if (!block) return layout;
  const rows = readRows(block, field);
  if (rowIndex < 0 || rowIndex >= rows.length) return layout;
  const next = rows.map((row, i) => (i === rowIndex ? { ...row, ...values } : row));
  return updateBlockField(layout, index, field, next);
}

/** Delete one row from a block's array field. */
export function removeRow(
  layout: PageBlock[],
  index: number,
  field: string,
  rowIndex: number,
): PageBlock[] {
  const block = layout[index];
  if (!block) return layout;
  const rows = readRows(block, field);
  if (rowIndex < 0 || rowIndex >= rows.length) return layout;
  return updateBlockField(layout, index, field, rows.filter((_, i) => i !== rowIndex));
}