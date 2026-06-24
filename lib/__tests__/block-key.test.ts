import { describe, expect, it } from 'vitest';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

const asRecord = (b: unknown): Record<string, unknown> => b as Record<string, unknown>;

describe('blockKey identity field', () => {
  it('should include a blockKey text field on every registered block schema', () => {
    const schemas = getBlockSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    for (const schema of schemas) {
      const keyField = schema.fields.find((f) => f.name === 'blockKey');
      expect(keyField, `block "${schema.slug}" missing blockKey`).toBeDefined();
      expect(keyField?.type).toBe('text');
    }
  });

  it('should generate a non-empty blockKey UUID when creating a default block', () => {
    const block = createDefaultBlock('text');
    expect(block).not.toBeNull();
    const key = asRecord(block).blockKey;
    expect(typeof key).toBe('string');
    expect((key as string).length).toBeGreaterThan(8);
  });

  it('should generate distinct blockKeys for successive default blocks', () => {
    const a = asRecord(createDefaultBlock('text')).blockKey;
    const b = asRecord(createDefaultBlock('text')).blockKey;
    expect(a).not.toBe(b);
  });

  it('should preserve blockKey when stripBlockIds removes the row id', () => {
    const schemas: BlockSchema[] = [
      { slug: 'text', label: 'Text', fields: [{ name: 'blockKey', type: 'text' }, { name: 'heading', type: 'text' }] },
    ];
    const layout = [{ id: 'row1', blockType: 'text', blockKey: 'k-123', heading: 'Hi' }] as unknown as import('@/lib/page-builder').PageBlock[];
    const out = stripBlockIds(layout, schemas);
    expect(asRecord(out[0]).id).toBeUndefined();
    expect(asRecord(out[0]).blockKey).toBe('k-123');
  });
});