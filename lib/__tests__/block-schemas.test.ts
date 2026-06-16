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
    expect(slugs).toHaveLength(13);
  });

  it('should describe hero text and select fields with options', () => {
    const hero = getBlockSchema('hero');
    expect(hero).not.toBeNull();
    const headline = hero!.fields.find((f) => f.name === 'headline');
    expect(headline).toMatchObject({ name: 'headline', type: 'text', required: true });
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

  it('should be JSON-serializable (no functions leak through)', () => {
    const schemas = getBlockSchemas();
    expect(() => JSON.parse(JSON.stringify(schemas))).not.toThrow();
    const roundTripped = JSON.parse(JSON.stringify(schemas));
    expect(roundTripped[0].fields[0]).not.toHaveProperty('condition.fn');
  });
});