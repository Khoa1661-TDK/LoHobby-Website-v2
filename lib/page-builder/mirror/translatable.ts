// lib/page-builder/mirror/translatable.ts — select the human-readable text fields of a block
// for translation, recursing into array rows. Rich text, relationships, uploads, selects,
// numbers, and a denylist of URL/color/technical text fields are excluded.
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import type { KeyedBlock } from './reconcile';

const DENYLIST = new Set([
  'blockKey',
  'blockType',
  'backgroundCustom',
  'backgroundCustomDark',
  'url',
  'href',
  'ctaHref',
  'ctaUrl',
  'primaryUrl',
  'secondaryUrl',
]);

export type TextEntry = { path: string; value: string };

function isTranslatableText(field: FieldDescriptor): boolean {
  return (field.type === 'text' || field.type === 'textarea') && !DENYLIST.has(field.name);
}

function walk(
  value: Record<string, unknown>,
  fields: FieldDescriptor[],
  prefix: string,
  out: TextEntry[],
): void {
  for (const field of fields) {
    const name = field.name;
    if (field.type === 'array') {
      const arr = value[name];
      if (!Array.isArray(arr)) continue;
      const subFields = field.fields ?? [];
      arr.forEach((row, i) => {
        if (row && typeof row === 'object') {
          walk(row as Record<string, unknown>, subFields, `${prefix}${name}.${i}.`, out);
        }
      });
    } else if (isTranslatableText(field)) {
      const v = value[name];
      if (typeof v === 'string' && v.trim()) out.push({ path: `${prefix}${name}`, value: v });
    }
    // richText, relationship, upload, select, number, checkbox, group → skipped
  }
}

export function collectTranslatable(block: KeyedBlock, schema: BlockSchema | null): TextEntry[] {
  if (!schema) return [];
  const out: TextEntry[] = [];
  walk(block as Record<string, unknown>, schema.fields, '', out);
  return out;
}

function setAtPath(root: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.');
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cursor[part];
    if (Array.isArray(next)) {
      const idx = Number(parts[++i]);
      const item = next[idx];
      if (item && typeof item === 'object') {
        cursor = item as Record<string, unknown>;
      } else {
        return;
      }
    } else if (next && typeof next === 'object') {
      cursor = next as Record<string, unknown>;
    } else {
      return;
    }
  }
  cursor[parts[parts.length - 1]!] = value;
}

export function applyTranslations(
  block: KeyedBlock,
  entries: Record<string, string>,
): KeyedBlock {
  const root = structuredClone(block) as Record<string, unknown>;
  for (const [path, value] of Object.entries(entries)) {
    if (typeof value === 'string') setAtPath(root, path, value);
  }
  return root as unknown as KeyedBlock;
}