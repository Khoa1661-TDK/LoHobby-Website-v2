import { describe, it, expect } from 'vitest';
import { isStructurallyAligned, syncFromActive } from '@/lib/page-builder/mirror/structure-sync';
import type { KeyedBlock } from '@/lib/page-builder/mirror/reconcile';

// A minimal keyed block; fields beyond blockType/blockKey stand in for per-locale copy.
function blk(key: string | undefined, blockType: string, copy: string): KeyedBlock {
  const b: Record<string, unknown> = { blockType, copy };
  if (key !== undefined) b.blockKey = key;
  return b as unknown as KeyedBlock;
}

describe('isStructurallyAligned', () => {
  it('should return true when both layouts are empty', () => {
    expect(isStructurallyAligned([], [])).toBe(true);
  });

  it('should return true when lengths and blockKeys match at every position', () => {
    const vi = [blk('a', 'hero', 'Xin chào'), blk('b', 'spotlight', 'Nổi bật')];
    const en = [blk('a', 'hero', 'Hello'), blk('b', 'spotlight', 'Featured')];
    expect(isStructurallyAligned(vi, en)).toBe(true);
  });

  it('should return false when the layouts have different lengths', () => {
    const vi = [blk('a', 'hero', 'A'), blk('b', 'spotlight', 'B')];
    const en = [blk('a', 'hero', 'A')];
    expect(isStructurallyAligned(vi, en)).toBe(false);
  });

  it('should return false when a blockKey differs at a position', () => {
    const vi = [blk('a', 'hero', 'A'), blk('b', 'spotlight', 'B')];
    const en = [blk('a', 'hero', 'A'), blk('c', 'spotlight', 'B')];
    expect(isStructurallyAligned(vi, en)).toBe(false);
  });

  it('should return false when a block is missing its blockKey', () => {
    const vi = [blk(undefined, 'hero', 'A')];
    const en = [blk(undefined, 'hero', 'A')];
    expect(isStructurallyAligned(vi, en)).toBe(false);
  });
});

describe('syncFromActive', () => {
  it('should produce structurally aligned layouts', () => {
    const active = [blk('a', 'hero', 'A'), blk('b', 'spotlight', 'B')];
    const other = [blk('b', 'spotlight', 'B-other')];
    const res = syncFromActive(active, other);
    expect(isStructurallyAligned(res.active, res.other)).toBe(true);
    expect(res.active).toHaveLength(2);
    expect(res.other).toHaveLength(2);
  });

  it('should preserve the other locale copy for blocks matched by blockKey', () => {
    const active = [blk('a', 'hero', 'A-active')];
    const other = [blk('a', 'hero', 'A-other')];
    const res = syncFromActive(active, other);
    expect((res.other[0] as unknown as { copy: string }).copy).toBe('A-other');
  });

  it('should clone the active block where the other locale is missing one', () => {
    const active = [blk('a', 'hero', 'A'), blk('b', 'spotlight', 'B')];
    const other = [blk('a', 'hero', 'A-other')];
    const res = syncFromActive(active, other);
    // Position 1 (key 'b') had no counterpart → cloned from active.
    expect((res.other[1] as unknown as { copy: string }).copy).toBe('B');
    expect(res.other[1]!.blockKey).toBe('b');
  });

  it('should drop blocks that exist only in the other locale', () => {
    const active = [blk('a', 'hero', 'A')];
    const other = [blk('a', 'hero', 'A-other'), blk('z', 'spotlight', 'orphan')];
    const res = syncFromActive(active, other);
    expect(res.other.map((b) => b.blockKey)).toEqual(['a']);
  });

  it('should assign fresh shared keys to unkeyed legacy blocks so the result is alignable', () => {
    const active = [blk(undefined, 'hero', 'A'), blk(undefined, 'spotlight', 'B')];
    const other = [blk(undefined, 'hero', 'A'), blk(undefined, 'spotlight', 'B')];
    const res = syncFromActive(active, other);
    expect(isStructurallyAligned(res.active, res.other)).toBe(true);
    // Every position now carries a defined, matching key.
    expect(res.active[0]!.blockKey).toBeTruthy();
    expect(res.active[0]!.blockKey).toBe(res.other[0]!.blockKey);
    expect(res.active[1]!.blockKey).toBe(res.other[1]!.blockKey);
    expect(res.active[0]!.blockKey).not.toBe(res.active[1]!.blockKey);
  });
});
