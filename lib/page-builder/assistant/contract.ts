// lib/page-builder/assistant/contract.ts — renders block schemas into the model-facing
// contract. Two tiers: a compact index of every block that lives in the system prompt, and
// a full per-block spec served on demand by the describe_block tool. Expanding all 37
// blocks inline costs ~22k tokens per turn; the index costs ~2.5k.
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import { splitAppearance } from '@/lib/page-builder/assistant/schema-tree';
import { THEMED_COLOR_BASES } from '@/lib/page-builder/themed-color';

/** Short type hint used in the compact index: just the name, with `[]` marking arrays. */
function indexFieldName(field: FieldDescriptor): string {
  return field.type === 'array' ? `${field.name}[]` : field.name;
}

/** One line per block: slug, label, its own field names, and the shared appearance marker. */
export function buildBlockIndex(schemas: BlockSchema[]): string {
  return schemas
    .map((schema) => {
      const { own, appearance } = splitAppearance(schema.fields);
      const names = own.map(indexFieldName).join(', ');
      const suffix = appearance.length > 0 ? ', +appearance' : '';
      return `  ${schema.slug} — ${schema.label}. fields: ${names}${suffix}`;
    })
    .join('\n');
}

/** Render one field as a full spec line for describe_block. `indent` nests array rows. */
export function describeFieldLine(field: FieldDescriptor, indent: string): string {
  const parts: string[] = [];

  if (field.type === 'array') {
    parts.push(`${indent}${field.name}: array of rows, each:`);
    for (const sub of field.fields ?? []) {
      parts.push(describeFieldLine(sub, `${indent}    `));
    }
    if (field.description) parts.push(`${indent}    note: ${field.description}`);
    return parts.join('\n');
  }

  if (field.type === 'group') {
    parts.push(`${indent}${field.name}: object with:`);
    for (const sub of field.fields ?? []) {
      parts.push(describeFieldLine(sub, `${indent}    `));
    }
    return parts.join('\n');
  }

  let line = `${indent}${field.name}: `;
  if (field.type === 'relationship') {
    const target = field.relationTo ?? 'a collection';
    const many = field.hasMany ? ' (array of numeric ids)' : '';
    line += `numeric id of a ${target}${many} — call search_catalog to find one; never invent an id, omit to leave unbound`;
  } else if (field.type === 'upload') {
    line += `numeric media id — call search_media to find one; omit to leave the image unset`;
  } else if (field.type === 'richText') {
    line += 'richText — provide a Markdown string (paragraphs, # headings, **bold**, *italic*, [text](url), - lists)';
  } else {
    line += field.type;
    if (field.options) line += ` (one of: ${field.options.map((o) => o.value).join(', ')})`;
    if (typeof field.min === 'number' && typeof field.max === 'number') line += ` (${field.min}–${field.max})`;
    else if (typeof field.min === 'number') line += ` (min ${field.min})`;
    else if (typeof field.max === 'number') line += ` (max ${field.max})`;
  }

  if (field.defaultValue !== undefined) line += ` [default ${JSON.stringify(field.defaultValue)}]`;
  if (field.required) line += ' [required]';
  if (field.condition) {
    line += ` — ONLY applies when ${field.condition.field}=${JSON.stringify(field.condition.equals)}; set that too or this value is ignored`;
  }
  if (field.description) line += ` — ${field.description}`;
  return line;
}

/** The light/dark slot pairs the model must set together, derived from THEMED_COLOR_BASES
 *  so the prompt tracks the schema instead of hardcoding field names. */
function themedColorPairs(): string {
  return Array.from(THEMED_COLOR_BASES)
    .map((base) => `${base} (light) + ${base}Dark (dark)`)
    .join(', ');
}

/** Every block carries the same appearance group, so document it once here instead of
 *  repeating ~10 fields in all 37 index lines and every describe_block response. */
export function buildAppearanceDoc(schemas: BlockSchema[]): string {
  const source = schemas.find((s) => splitAppearance(s.fields).appearance.length > 0);
  const appearance = source ? splitAppearance(source.fields).appearance : [];
  const lines = appearance.map((f) => describeFieldLine(f, '  ')).join('\n');
  return [
    'SHARED APPEARANCE FIELDS (available on every block shown with "+appearance"):',
    lines,
    '',
    `Themed color pairs — set BOTH slots whenever you set a background: ${themedColorPairs()}. The base field is the LIGHT-mode value and the "Dark" field is the DARK-mode value. If you only know one color (e.g. from an image), set the light slot to it and derive a readable dark-mode variant for the "Dark" slot (dark surfaces with light text).`,
  ].join('\n');
}

/** Full spec for one block: its own fields expanded to any depth. Appearance fields are
 *  omitted — they are documented once in the system prompt. */
export function describeBlockSpec(schema: BlockSchema): string {
  const { own, appearance } = splitAppearance(schema.fields);
  const lines = own.map((f) => describeFieldLine(f, '    ')).join('\n');
  const tail =
    appearance.length > 0
      ? '\n    (plus the shared appearance fields documented in the system prompt)'
      : '';
  return `${schema.slug} — ${schema.label}\n${lines}${tail}`;
}
