import { describe, expect, it } from 'vitest';
import {
  updateBlockField,
  moveBlock,
  duplicateBlock,
  deleteBlock,
  insertBlock,
  addRow,
  updateRow,
  removeRow,
} from '@/lib/page-builder/layout-reducer';
import type { PageBlock } from '@/lib/page-builder';

const layout: PageBlock[] = [
  { blockType: 'hero', headline: 'A' } as unknown as PageBlock,
  { blockType: 'divider' } as unknown as PageBlock,
  { blockType: 'faq', title: 'Q' } as unknown as PageBlock,
];

describe('updateBlockField', () => {
  it('should set a field on the targeted block without mutating the input', () => {
    const next = updateBlockField(layout, 1, 'headline', 'B');
    expect((next[1] as Record<string, unknown>).headline).toBe('B');
    expect((layout[1] as Record<string, unknown>).headline).toBeUndefined();
  });
  it('should return the same array reference shape but a new array', () => {
    const next = updateBlockField(layout, 0, 'headline', 'Z');
    expect(next).not.toBe(layout);
    expect((next[0] as Record<string, unknown>).headline).toBe('Z');
  });
});

describe('moveBlock', () => {
  it('should move a block down', () => {
    const next = moveBlock(layout, 0, 1);
    expect(next.map((b) => b.blockType)).toEqual(['divider', 'hero', 'faq']);
  });
  it('should clamp out-of-range targets', () => {
    const next = moveBlock(layout, 2, 99);
    expect(next.map((b) => b.blockType)).toEqual(['hero', 'divider', 'faq']);
  });
});

describe('duplicateBlock', () => {
  it('should insert a deep copy right after the original', () => {
    const next = duplicateBlock(layout, 2);
    expect(next).toHaveLength(4);
    expect(next[3]!.blockType).toBe('faq');
    expect(next[3]!).not.toBe(layout[2]);
  });
});

describe('deleteBlock', () => {
  it('should remove the targeted block', () => {
    const next = deleteBlock(layout, 1);
    expect(next.map((b) => b.blockType)).toEqual(['hero', 'faq']);
  });
});

describe('insertBlock', () => {
  it('should insert a new block at the given index', () => {
    const block = { blockType: 'newsletter' } as unknown as PageBlock;
    const next = insertBlock(layout, 1, block);
    expect(next.map((b) => b.blockType)).toEqual(['hero', 'newsletter', 'divider', 'faq']);
  });
});

describe('row reducers', () => {
  const layout = [
    { blockType: 'faq', items: [{ question: 'A' }, { question: 'B' }] },
  ] as unknown as PageBlock[];

  it('should append a row when no position is given', () => {
    const next = addRow(layout, 0, 'items', { question: 'C' });
    expect((next[0] as unknown as { items: unknown[] }).items).toHaveLength(3);
    expect((next[0] as unknown as { items: Array<{ question: string }> }).items[2]?.question).toBe('C');
  });

  it('should insert a row at an explicit position', () => {
    const next = addRow(layout, 0, 'items', { question: 'C' }, 0);
    expect((next[0] as unknown as { items: Array<{ question: string }> }).items[0]?.question).toBe('C');
  });

  it('should create the array when the field is empty', () => {
    const empty = [{ blockType: 'faq' }] as unknown as PageBlock[];
    const next = addRow(empty, 0, 'items', { question: 'A' });
    expect((next[0] as unknown as { items: unknown[] }).items).toHaveLength(1);
  });

  it('should patch only the named fields of the target row', () => {
    const seeded = [
      { blockType: 'faq', items: [{ question: 'A', answer: 'x' }] },
    ] as unknown as PageBlock[];
    const next = updateRow(seeded, 0, 'items', 0, { answer: 'y' });
    const row = (next[0] as unknown as { items: Array<Record<string, unknown>> }).items[0];
    expect(row).toEqual({ question: 'A', answer: 'y' });
  });

  it('should remove the row at the given index', () => {
    const next = removeRow(layout, 0, 'items', 0);
    const items = (next[0] as unknown as { items: Array<{ question: string }> }).items;
    expect(items).toHaveLength(1);
    expect(items[0]?.question).toBe('B');
  });

  it('should return the layout unchanged for an out-of-range row index', () => {
    expect(updateRow(layout, 0, 'items', 9, { question: 'X' })).toBe(layout);
    expect(removeRow(layout, 0, 'items', 9)).toBe(layout);
  });

  it('should return the layout unchanged for an out-of-range block index', () => {
    expect(addRow(layout, 5, 'items', { question: 'X' })).toBe(layout);
  });

  it('should not mutate the input layout', () => {
    addRow(layout, 0, 'items', { question: 'C' });
    expect((layout[0] as unknown as { items: unknown[] }).items).toHaveLength(2);
  });
});