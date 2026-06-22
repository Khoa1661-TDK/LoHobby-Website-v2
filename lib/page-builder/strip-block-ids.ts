// lib/page-builder/strip-block-ids.ts — remove block/array-row ids before a locale save.
//
// The `layout` field is a localized `blocks` field. Each locale's blocks live in the same
// `pages_blocks_*` table tagged by a `_locale` column, but those tables are keyed by `id`
// alone — so a given block (or nested array row) id can exist in only one locale. The
// builder loads a not-yet-translated locale with fallback content, which carries the
// default locale's ids; saving them under another locale collides on the primary key
// ("Value must be unique: id"). Stripping the ids lets Payload mint fresh per-locale ids.
//
// Relationship/upload values are populated objects that carry their own `id`; those must be
// left intact, so stripping is schema-driven (only `id`s of blocks and `array`-type rows).
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import type { PageBlock } from '@/lib/page-builder';

function stripRow(
  row: Record<string, unknown>,
  fields: FieldDescriptor[],
): Record<string, unknown> {
  const { id: _id, ...rest } = row;
  void _id;
  for (const field of fields) {
    if (field.type !== 'array' || !Array.isArray(rest[field.name])) continue;
    rest[field.name] = (rest[field.name] as unknown[]).map((item) =>
      item && typeof item === 'object'
        ? stripRow(item as Record<string, unknown>, field.fields ?? [])
        : item,
    );
  }
  return rest;
}

/** Return a deep copy of `layout` with every block and nested array-row `id` removed. */
export function stripBlockIds(layout: PageBlock[], schemas: BlockSchema[]): PageBlock[] {
  return layout.map((block) => {
    const record = block as unknown as Record<string, unknown>;
    const schema = schemas.find((s) => s.slug === record.blockType);
    return stripRow(record, schema?.fields ?? []) as unknown as PageBlock;
  });
}
