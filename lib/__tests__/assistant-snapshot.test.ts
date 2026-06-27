import { describe, expect, it } from 'vitest';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import type { PageBlock } from '@/lib/page-builder';

describe('serializeLayout', () => {
  it('should map each block to its index, blockType, and short string fields', () => {
    const layout = [
      { blockType: 'hero', heading: 'Welcome', subheading: 'Sub', cta: { url: '/x' } },
      { blockType: 'faq', title: 'Questions' },
    ] as unknown as PageBlock[];

    const out = serializeLayout(layout);

    expect(out).toEqual([
      { index: 0, blockType: 'hero', summary: { heading: 'Welcome', subheading: 'Sub' } },
      { index: 1, blockType: 'faq', summary: { title: 'Questions' } },
    ]);
  });

  it('should omit non-string and object fields from the summary', () => {
    const layout = [
      { blockType: 'stats', items: [{ n: 1 }], count: 5, label: 'x' },
    ] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary).toEqual({ label: 'x' });
  });
});
