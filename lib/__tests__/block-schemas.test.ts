import { describe, expect, it } from 'vitest';
import {
  getBlockSchemas,
  getBlockSchema,
  type FieldDescriptor,
} from '@/lib/page-builder/block-schemas';

describe('getBlockSchemas', () => {
  it('should expose one schema per registered layout block', () => {
    const schemas = getBlockSchemas();
    const slugs = schemas.map((s) => s.slug);
    expect(slugs).toContain('hero');
    expect(slugs).toContain('faq');
    expect(slugs).toContain('gallery');
    // The link/text/button/social blocks added button, text, and socialBar.
    expect(slugs).toContain('button');
    expect(slugs).toContain('text');
    expect(slugs).toContain('socialBar');
    // The section-library blocks added 8 presentational sections.
    expect(slugs).toEqual(
      expect.arrayContaining([
        'spacer',
        'columns',
        'callToAction',
        'stats',
        'quote',
        'cardGrid',
        'banner',
        'steps',
      ]),
    );
    // The block-expansion library added pricingTable, countdown, tabs, featureGrid.
    expect(slugs).toEqual(
      expect.arrayContaining(['pricingTable', 'countdown', 'tabs', 'featureGrid']),
    );
    // The Lô Hobby retheme added productShowcase and reels.
    expect(slugs).toEqual(
      expect.arrayContaining(['productShowcase', 'reels']),
    );
    expect(slugs).toHaveLength(32);
  });

  it('should describe hero text and select fields with options', () => {
    const hero = getBlockSchema('hero');
    expect(hero).not.toBeNull();
    const headline = hero!.fields.find((f) => f.name === 'headline');
    // headline is no longer required (relaxed by 20260621_053000_relax_page_block_required).
    expect(headline).toMatchObject({ name: 'headline', type: 'text' });
    const ctaStyle = hero!.fields.find((f) => f.name === 'ctaStyle');
    expect(ctaStyle?.type).toBe('select');
    expect(ctaStyle?.options).toEqual([
      { label: 'Primary', value: 'primary' },
      { label: 'Outline', value: 'outline' },
      { label: 'Minimal', value: 'minimal' },
    ]);
    expect(ctaStyle?.defaultValue).toBe('primary');
  });

  it('should describe upload fields and the appearance group', () => {
    const hero = getBlockSchema('hero')!;
    const image = hero.fields.find((f) => f.name === 'image');
    expect(image).toMatchObject({ type: 'upload', relationTo: 'media' });
    const bg = hero.fields.find((f) => f.name === 'background');
    expect(bg?.type).toBe('select');
    // backgroundCustom carries its condition flag so the panel can hide it.
    const custom = hero.fields.find((f) => f.name === 'backgroundCustom');
    expect(custom?.condition).toEqual({ field: 'background', equals: 'custom' });
  });

  it('should describe array fields with nested sub-fields', () => {
    const faq = getBlockSchema('faq')!;
    const items = faq.fields.find((f) => f.name === 'items') as FieldDescriptor;
    expect(items.type).toBe('array');
    expect(items.fields?.map((f) => f.name)).toEqual(['question', 'answer']);
    expect(items.fields?.find((f) => f.name === 'answer')?.type).toBe('richText');
  });

  it('should include recommendations and recentlyViewed blocks', () => {
    const schemas = getBlockSchemas();
    const slugs = schemas.map((s) => s.slug);
    expect(slugs).toContain('recommendations');
    expect(slugs).toContain('recentlyViewed');
  });

  it('should describe recommendations title and limit fields', () => {
    const recs = getBlockSchema('recommendations')!;
    const title = recs.fields.find((f) => f.name === 'title');
    expect(title).toMatchObject({ type: 'text', defaultValue: 'Recommended for you' });
    const limit = recs.fields.find((f) => f.name === 'limit');
    expect(limit?.type).toBe('number');
  });

  it('should be JSON-serializable (no functions leak through)', () => {
    const schemas = getBlockSchemas();
    expect(() => JSON.parse(JSON.stringify(schemas))).not.toThrow();
    const roundTripped = JSON.parse(JSON.stringify(schemas));
    expect(roundTripped[0].fields[0]).not.toHaveProperty('condition.fn');
  });
});

describe('relationship field descriptors', () => {
  it('should expose relationTo and hasMany for a hasMany relationship (featuredProducts.products)', () => {
    const schema = getBlockSchema('featuredProducts');
    const products = schema?.fields.find((f) => f.name === 'products');
    expect(products).toMatchObject({ type: 'relationship', relationTo: 'products', hasMany: true });
  });

  it('should expose relationTo and hasMany=false for a single relationship (featuredCollection.collection)', () => {
    const schema = getBlockSchema('featuredCollection');
    const collection = schema?.fields.find((f) => f.name === 'collection');
    expect(collection).toMatchObject({ type: 'relationship', relationTo: 'categories', hasMany: false });
  });
});

describe('pinned products on auto blocks', () => {
  it.each(['recommendations', 'recentlyViewed'])(
    'should expose an optional products relationship on %s',
    (slug) => {
      const products = getBlockSchema(slug)?.fields.find((f) => f.name === 'products');
      expect(products).toMatchObject({ type: 'relationship', relationTo: 'products', hasMany: true });
    },
  );
});