import { describe, expect, it } from 'vitest';
import { createDefaultBlock, defaultForField } from '@/lib/page-builder/default-block';

describe('createDefaultBlock', () => {
  it('should set blockType and apply schema default values', () => {
    const block = createDefaultBlock('hero');
    expect(block).not.toBeNull();
    expect(block!.blockType).toBe('hero');
    expect((block as Record<string, unknown>).ctaStyle).toBe('primary');
    expect((block as Record<string, unknown>).background).toBe('theme');
  });
  it('should seed required array fields with one empty row', () => {
    const block = createDefaultBlock('faq') as Record<string, unknown>;
    expect(Array.isArray(block.items)).toBe(true);
    expect((block.items as unknown[]).length).toBe(1);
  });
  it('should return null for an unknown block type', () => {
    expect(createDefaultBlock('nope')).toBeNull();
  });
});

describe('relationship defaults', () => {
  it('should default a hasMany relationship to an empty array', () => {
    expect(defaultForField({ name: 'products', type: 'relationship', relationTo: 'products', hasMany: true })).toEqual([]);
  });

  it('should default a single relationship to null', () => {
    expect(defaultForField({ name: 'collection', type: 'relationship', relationTo: 'categories', hasMany: false })).toBeNull();
  });
});