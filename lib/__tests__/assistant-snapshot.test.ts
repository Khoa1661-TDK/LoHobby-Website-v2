import { describe, expect, it } from 'vitest';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import type { PageBlock } from '@/lib/page-builder';

describe('serializeLayout', () => {
  it('should map each block to its index, blockType, and string fields', () => {
    const layout = [
      { blockType: 'hero', heading: 'Welcome', subheading: 'Sub' },
      { blockType: 'faq', title: 'Questions' },
    ] as unknown as PageBlock[];

    const out = serializeLayout(layout);

    expect(out[0]).toMatchObject({ index: 0, blockType: 'hero' });
    expect(out[0]?.summary.heading).toBe('Welcome');
    expect(out[1]?.summary.title).toBe('Questions');
  });

  it('should include numbers, booleans, and enum values', () => {
    const layout = [{ blockType: 'faq', limit: 4, border: true, layout: 'accordion' }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    // Numbers render as `#N` uniformly — see the `summarize()` doc comment: a bare number
    // field and a bound relationship id are indistinguishable without schema access, so both
    // collapse to the same "a numeric value is present" signal.
    expect(summary.limit).toBe('#4');
    expect(summary.border).toBe('true');
    expect(summary.layout).toBe('accordion');
  });

  it('should report array row counts rather than contents', () => {
    const layout = [
      { blockType: 'faq', items: [{ question: 'A' }, { question: 'B' }] },
    ] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary.items).toBe('2 rows');
  });

  it('should report an empty array so unfilled blocks are visible', () => {
    const layout = [{ blockType: 'faq', items: [] }] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary.items).toBe('0 rows');
  });

  it('should distinguish false and 0 from unset fields', () => {
    const layout = [{ blockType: 'faq', border: false, limit: 0, title: '' }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    expect(summary.border).toBe('false');
    expect(summary.limit).toBe('#0');
    expect(summary.title).toBe('unset');
  });

  it('should report bound and unbound references', () => {
    const layout = [{ blockType: 'hero', image: 412, collection: null }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    expect(summary.image).toBe('#412');
    expect(summary.collection).toBe('unset');
  });

  it('should omit identity fields', () => {
    const layout = [{ blockType: 'faq', id: 3, blockKey: 'bk_1', title: 'T' }] as unknown as PageBlock[];
    const summary = serializeLayout(layout)[0]?.summary ?? {};
    expect(summary.id).toBeUndefined();
    expect(summary.blockKey).toBeUndefined();
    expect(summary.title).toBe('T');
  });

  it('should truncate long strings to 80 characters', () => {
    const layout = [{ blockType: 'faq', title: 'x'.repeat(200) }] as unknown as PageBlock[];
    expect(serializeLayout(layout)[0]?.summary.title).toHaveLength(80);
  });
});
