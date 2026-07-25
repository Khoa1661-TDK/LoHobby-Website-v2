import { describe, expect, it } from 'vitest';
import {
  APPEARANCE_FIELD_NAMES,
  contentFields,
  splitAppearance,
} from '@/lib/page-builder/assistant/schema-tree';
import { getBlockSchema } from '@/lib/page-builder/block-schemas';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

describe('APPEARANCE_FIELD_NAMES', () => {
  it('should be derived from the shared appearance field group', () => {
    expect(APPEARANCE_FIELD_NAMES.has('background')).toBe(true);
    expect(APPEARANCE_FIELD_NAMES.has('backgroundCustomDark')).toBe(true);
    expect(APPEARANCE_FIELD_NAMES.has('scrollAnimation')).toBe(true);
    expect(APPEARANCE_FIELD_NAMES.has('headline')).toBe(false);
  });
});

describe('contentFields', () => {
  it('should drop id and blockKey at the top level', () => {
    const fields = [
      { name: 'id', type: 'text' },
      { name: 'blockKey', type: 'text' },
      { name: 'headline', type: 'text' },
    ] as FieldDescriptor[];
    expect(contentFields(fields).map((f) => f.name)).toEqual(['headline']);
  });

  it('should drop id injected into nested array row fields', () => {
    const fields = [
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'id', type: 'text' },
          { name: 'question', type: 'text' },
        ],
      },
    ] as FieldDescriptor[];
    const rows = contentFields(fields)[0]?.fields ?? [];
    expect(rows.map((f) => f.name)).toEqual(['question']);
  });

  it('should not mutate the input descriptors', () => {
    const fields = [{ name: 'id', type: 'text' }, { name: 'a', type: 'text' }] as FieldDescriptor[];
    contentFields(fields);
    expect(fields).toHaveLength(2);
  });
});

describe('splitAppearance', () => {
  it('should separate a real block into its own fields and the shared appearance set', () => {
    const faq = getBlockSchema('faq')!;
    const { own, appearance } = splitAppearance(faq.fields);
    expect(own.map((f) => f.name)).toContain('items');
    expect(own.map((f) => f.name)).not.toContain('background');
    expect(appearance.map((f) => f.name)).toContain('background');
  });
});
