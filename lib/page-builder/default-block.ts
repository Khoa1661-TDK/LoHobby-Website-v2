// lib/page-builder/default-block.ts — instantiate a fresh block from its schema defaults.
import { getBlockSchema, type FieldDescriptor } from '@/lib/page-builder/block-schemas';
import type { PageBlock } from '@/lib/page-builder';

export function defaultForField(field: FieldDescriptor): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === 'array') {
    if (field.required) {
      const row: Record<string, unknown> = {};
      for (const sub of field.fields ?? []) row[sub.name] = defaultForField(sub);
      return [row];
    }
    return [];
  }
  if (field.type === 'text' || field.type === 'textarea') return '';
  if (field.type === 'richText') return null;
  if (field.type === 'relationship') return field.hasMany ? [] : null;
  return null;
}

export function defaultRowFor(fields: FieldDescriptor[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const f of fields) row[f.name] = defaultForField(f);
  return row;
}

export function createDefaultBlock(slug: string): PageBlock | null {
  const schema = getBlockSchema(slug);
  if (!schema) return null;
  const block: Record<string, unknown> = { blockType: slug };
  for (const field of schema.fields) {
    block[field.name] = defaultForField(field);
  }
  return block as unknown as PageBlock;
}