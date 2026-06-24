import { describe, expect, it } from 'vitest';
import { reconcileLayout, blockKeyOf } from '@/lib/page-builder/mirror/reconcile';
import type { KeyedBlock } from '@/lib/page-builder/mirror/reconcile';

const blk = (blockType: string, blockKey: string, extra: Record<string, unknown> = {}): KeyedBlock =>
  ({ blockType, blockKey, ...extra }) as KeyedBlock;

const keys = (layout: KeyedBlock[]): string[] => layout.map(blockKeyOf).filter((k): k is string => !!k);

describe('reconcileLayout', () => {
  it('should mirror a newly added block to the other locale and mark it for translation', () => {
    const active = [blk('text', 'k1', { heading: 'Hello' })];
    const other: KeyedBlock[] = [];
    const res = reconcileLayout(active, other, new Set());
    expect(keys(res.reconciled)).toEqual(['k1']);
    expect(res.addedForOther.has('k1')).toBe(true);
    expect(res.changed).toBe(true);
  });

  it('should reuse the other locale block (preserving its text) for an edit, and report no change', () => {
    const active = [blk('text', 'k1', { heading: 'Edited' })];
    const other = [blk('text', 'k1', { heading: 'Hola' })];
    const res = reconcileLayout(active, other, new Set(['k1']));
    // Reused the other locale's object verbatim — the active edit did NOT propagate.
    expect((res.reconciled[0] as Record<string, unknown>).heading).toBe('Hola');
    expect(res.addedForOther.has('k1')).toBe(false);
    expect(res.changed).toBe(false);
  });

  it('should delete a block from the other locale when removed from active', () => {
    const active: KeyedBlock[] = [];
    const other = [blk('text', 'k1', { heading: 'Hola' })];
    const res = reconcileLayout(active, other, new Set(['k1']));
    expect(res.reconciled).toEqual([]);
    expect(res.removedKeys.has('k1')).toBe(true);
    expect(res.changed).toBe(true);
  });

  it('should reorder shared blocks to follow the active locale order', () => {
    const active = [blk('text', 'k2'), blk('text', 'k1')];
    const other = [blk('text', 'k1', { heading: 'A' }), blk('text', 'k2', { heading: 'B' })];
    const res = reconcileLayout(active, other, new Set(['k1', 'k2']));
    expect(keys(res.reconciled)).toEqual(['k2', 'k1']);
    // Text preserved on each reused block.
    expect((res.reconciled[0] as Record<string, unknown>).heading).toBe('B');
    expect((res.reconciled[1] as Record<string, unknown>).heading).toBe('A');
    expect(res.orderChanged).toBe(true);
    expect(res.changed).toBe(true);
  });

  it('should preserve other-locale-only blocks at the end and report no change', () => {
    const active = [blk('text', 'k1')];
    const other = [blk('text', 'k1', { heading: 'A' }), blk('text', 'kOther', { heading: 'only-en' })];
    const res = reconcileLayout(active, other, new Set(['k1']));
    expect(keys(res.reconciled)).toEqual(['k1', 'kOther']);
    expect((res.reconciled[1] as Record<string, unknown>).heading).toBe('only-en');
    expect(res.changed).toBe(false); // no add/remove/reorder of shared blocks
  });

  it('should mirror all blocks on first create (prior keys empty, other empty)', () => {
    const active = [blk('text', 'k1'), blk('faq', 'k2')];
    const res = reconcileLayout(active, [], new Set());
    expect(keys(res.reconciled)).toEqual(['k1', 'k2']);
    expect(res.addedForOther.size).toBe(2);
    expect(res.changed).toBe(true);
  });

  it('should translate a block that exists in active but was never mirrored to other', () => {
    const active = [blk('text', 'k1', { heading: 'Hi' })];
    const other: KeyedBlock[] = [];
    const res = reconcileLayout(active, other, new Set(['k1'])); // existed before in active
    expect(res.addedForOther.has('k1')).toBe(true); // missing in other → create + translate
    expect(res.changed).toBe(true);
  });

  it('should skip blocks without a blockKey in the active locale (cannot track them)', () => {
    const noKey = { blockType: 'text', heading: 'legacy' } as KeyedBlock;
    const active = [noKey];
    const other: KeyedBlock[] = [];
    const res = reconcileLayout(active, other, new Set());
    expect(res.reconciled).toEqual([]); // unkeyed active block not mirrored
    expect(res.changed).toBe(false);
  });

  it('should keep an unkeyed other-locale block in place', () => {
    const noKey = { blockType: 'text', heading: 'legacy-en' } as KeyedBlock;
    const active: KeyedBlock[] = [];
    const other = [noKey];
    const res = reconcileLayout(active, other, new Set());
    expect(res.reconciled).toEqual([noKey]);
  });
});