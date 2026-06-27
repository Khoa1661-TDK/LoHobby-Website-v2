import { applyMutation } from '@/lib/page-builder/assistant/apply';
import type { PageBlock } from '@/lib/page-builder';

const base = [
  { blockType: 'hero', heading: 'A' },
  { blockType: 'faq', title: 'B' },
] as unknown as PageBlock[];

describe('applyMutation', () => {
  it('should insert a block for an add mutation', () => {
    const out = applyMutation(base, {
      kind: 'add',
      index: 1,
      block: { blockType: 'newsletter' },
    });
    expect(out.map((b) => b.blockType)).toEqual(['hero', 'newsletter', 'faq']);
  });

  it('should set fields for an update mutation', () => {
    const out = applyMutation(base, { kind: 'update', index: 0, fields: { heading: 'Z' } });
    expect((out[0] as Record<string, unknown>).heading).toBe('Z');
  });

  it('should move, remove, and duplicate', () => {
    expect(applyMutation(base, { kind: 'move', from: 0, to: 1 }).map((b) => b.blockType)).toEqual([
      'faq',
      'hero',
    ]);
    expect(applyMutation(base, { kind: 'remove', index: 0 }).map((b) => b.blockType)).toEqual([
      'faq',
    ]);
    expect(
      applyMutation(base, { kind: 'duplicate', index: 0 }).map((b) => b.blockType),
    ).toEqual(['hero', 'hero', 'faq']);
  });

  it('should not mutate the input array', () => {
    const copy = [...base];
    applyMutation(base, { kind: 'remove', index: 0 });
    expect(base).toEqual(copy);
  });
});
