import { describe, expect, it } from 'vitest';
import {
  updateBlockField,
  moveBlock,
  duplicateBlock,
  deleteBlock,
  insertBlock,
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