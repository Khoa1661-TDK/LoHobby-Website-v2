import { describe, expect, it } from 'vitest';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import type { PageBlock } from '@/lib/page-builder';

// Block tables are keyed by `id` alone but carry a `_locale` column, so the same
// block/array-row id cannot exist in two locales. The builder loads a not-yet-translated
// locale with fallback content (carrying the default locale's ids), so those ids must be
// stripped before saving a locale or Postgres rejects the write with a duplicate pkey.
const schemas: BlockSchema[] = [
  {
    slug: 'faq',
    label: 'FAQ',
    fields: [
      { name: 'title', type: 'text' },
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'question', type: 'text' },
          { name: 'answer', type: 'text' },
        ],
      },
    ],
  },
  {
    slug: 'featuredCollection',
    label: 'Featured collection',
    fields: [{ name: 'collection', type: 'relationship', relationTo: 'categories' }],
  },
];

const asRecord = (block: PageBlock | undefined): Record<string, unknown> =>
  block as unknown as Record<string, unknown>;

describe('stripBlockIds', () => {
  it('should strip the top-level id from each block while keeping other fields', () => {
    const layout = [
      { id: 'abc', blockType: 'faq', title: 'Q', items: [] },
    ] as unknown as PageBlock[];

    const out = stripBlockIds(layout, schemas);

    expect(asRecord(out[0]).id).toBeUndefined();
    expect(asRecord(out[0]).title).toBe('Q');
  });

  it('should strip ids from rows of an array field', () => {
    const layout = [
      {
        id: 'b1',
        blockType: 'faq',
        items: [
          { id: 'i1', question: 'q1', answer: 'a1' },
          { id: 'i2', question: 'q2', answer: 'a2' },
        ],
      },
    ] as unknown as PageBlock[];

    const out = stripBlockIds(layout, schemas);
    const items = asRecord(out[0]).items as Record<string, unknown>[];

    expect(items).toHaveLength(2);
    expect(items[0]?.id).toBeUndefined();
    expect(items[0]?.question).toBe('q1');
    expect(items[1]?.id).toBeUndefined();
  });

  it('should preserve the id of a populated relationship value', () => {
    const layout = [
      { id: 'b1', blockType: 'featuredCollection', collection: { id: 3, title: 'Toys' } },
    ] as unknown as PageBlock[];

    const out = stripBlockIds(layout, schemas);

    expect(asRecord(out[0]).id).toBeUndefined();
    expect(asRecord(out[0]).collection).toEqual({ id: 3, title: 'Toys' });
  });

  it('should not mutate the input layout', () => {
    const layout = [
      { id: 'b1', blockType: 'faq', items: [{ id: 'i1', question: 'q', answer: 'a' }] },
    ] as unknown as PageBlock[];
    const before = structuredClone(layout);

    stripBlockIds(layout, schemas);

    expect(layout).toEqual(before);
  });

  it('should still strip the top-level id when no schema matches the block', () => {
    const layout = [{ id: 'x', blockType: 'mystery', foo: 'bar' }] as unknown as PageBlock[];

    const out = stripBlockIds(layout, schemas);

    expect(asRecord(out[0]).id).toBeUndefined();
    expect(asRecord(out[0]).foo).toBe('bar');
  });
});
