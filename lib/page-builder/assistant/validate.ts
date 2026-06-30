// lib/page-builder/assistant/validate.ts — second-pass per-blockType validation.
import { getBlockSchema, getBlockSchemas, type BlockSchema, type FieldDescriptor } from '@/lib/page-builder/block-schemas';
import { markdownToLexical } from '@/lib/page-builder/lexical-markdown';

export type Mutation =
  | { kind: 'add'; index: number; block: Record<string, unknown> }
  | { kind: 'update'; index: number; fields: Record<string, unknown> }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'remove'; index: number }
  | { kind: 'duplicate'; index: number };

export type ValidateResult = { ok: true; mutation: Mutation } | { ok: false; error: string };

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** An unbound relationship — Payload accepts these and renders the block unconfigured. */
function isUnbound(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** Payload's default ID type here is numeric, so a relationship value must be an integer
 * (or an array of integers for hasMany). The LLM has no real ids and tends to fabricate
 * strings like "placeholder-collection-id-3"; those must be rejected before they reach
 * Payload, which 400s the whole page save on an invalid relationship. */
function checkRelationship(field: FieldDescriptor, value: unknown): string | null {
  if (isUnbound(value)) return null; // omitting a relationship is allowed
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    if (isUnbound(v)) continue;
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      return `Field "${field.name}" is a relationship to "${field.relationTo ?? 'a collection'}" and must be a numeric id (got ${JSON.stringify(
        v,
      )}). Use one of the valid ids listed in the contract, or omit it to leave the block unbound.`;
    }
  }
  return null;
}

/** Reject numeric values that fall outside a field's configured min/max bounds. The LLM
 * frequently emits out-of-range numbers (e.g. a negative `limit`), which pass name/enum
 * checks but make Payload 400 the whole page save. Returns an error string or null. */
function checkNumberBounds(field: FieldDescriptor, value: unknown): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null; // non-numbers handled elsewhere
  if (typeof field.min === 'number' && value < field.min) {
    return `Field "${field.name}" must be at least ${field.min} (got ${value}).`;
  }
  if (typeof field.max === 'number' && value > field.max) {
    return `Field "${field.name}" must be at most ${field.max} (got ${value}).`;
  }
  return null;
}

/** Reject any field not declared by the block, any enum value out of range, any
 * relationship value that is not a numeric id, and any number outside its min/max bounds. */
function checkFields(schema: BlockSchema, fields: Record<string, unknown>): string | null {
  const byName = new Map<string, FieldDescriptor>(schema.fields.map((f) => [f.name, f]));
  for (const [key, value] of Object.entries(fields)) {
    const field = byName.get(key);
    if (!field) return `Block "${schema.slug}" has no field "${key}".`;
    if (field.options && typeof value === 'string') {
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(value)) {
        return `Field "${key}" must be one of: ${allowed.join(', ')} (got "${value}").`;
      }
    }
    if (field.type === 'relationship') {
      const relErr = checkRelationship(field, value);
      if (relErr) return relErr;
    }
    if (field.type === 'number') {
      const numErr = checkNumberBounds(field, value);
      if (numErr) return numErr;
    }
  }
  return null;
}

/** Payload's `richText` column requires Lexical editor-state JSON, not a bare string.
 * The LLM emits plain Markdown/text for these fields, which passes name/enum validation
 * but makes Payload 400 the whole page save. Convert any string richText value to Lexical
 * JSON (matching what RichTextField produces), recursing into `array` rows. Mutates in place
 * so both the streamed mutation and the server working copy carry the storable shape. */
function coerceRichText(fields: FieldDescriptor[], values: Record<string, unknown>): void {
  for (const field of fields) {
    const value = values[field.name];
    if (value === undefined) continue;
    if (field.type === 'richText') {
      if (typeof value === 'string') {
        values[field.name] = markdownToLexical(value);
      }
      // Already-Lexical objects (and null/unbound) pass through unchanged.
      continue;
    }
    if (field.type === 'array' && Array.isArray(value)) {
      for (const row of value) {
        if (row && typeof row === 'object') {
          coerceRichText(field.fields ?? [], row as Record<string, unknown>);
        }
      }
    }
  }
}

/** Coerce richText fields on a known block type's field set, in place. Exposed so the
 * route can normalize update_block fields once the real block type is resolved. */
export function coerceFieldsForBlock(blockType: string, fields: Record<string, unknown>): void {
  const schema = getBlockSchema(blockType);
  if (schema) coerceRichText(schema.fields, fields);
}

export function validateToolCall(name: string, input: unknown): ValidateResult {
  const args = asRecord(input);

  switch (name) {
    case 'add_block': {
      const blockType = typeof args.blockType === 'string' ? args.blockType : '';
      const index = asInt(args.index);
      const fields = asRecord(args.fields);
      const schema = getBlockSchema(blockType);
      if (!schema) return { ok: false, error: `Unknown block type "${blockType}".` };
      if (index === null) return { ok: false, error: 'add_block requires an integer index.' };
      const fieldErr = checkFields(schema, fields);
      if (fieldErr) return { ok: false, error: fieldErr };
      // richText fields arrive as Markdown strings; store them as Lexical JSON so the
      // page save does not 400 (see coerceRichText).
      coerceRichText(schema.fields, fields);
      return { ok: true, mutation: { kind: 'add', index, block: { blockType, ...fields } } };
    }
    case 'update_block': {
      const index = asInt(args.index);
      const fields = asRecord(args.fields);
      if (index === null) return { ok: false, error: 'update_block requires an integer index.' };
      // First pass: validate field NAMES against the union of all blocks. If no block
      // declares a field at all, it is definitely invalid. This is a cheap early-out only —
      // the authoritative per-target-block check (field existence + enum range) runs in the
      // route handler via validateUpdateFields() once the real block type is known from
      // the server-side working layout.
      for (const key of Object.keys(fields)) {
        const known = anyBlockHasField(key);
        if (!known) return { ok: false, error: `No block defines a field named "${key}".` };
      }
      return { ok: true, mutation: { kind: 'update', index, fields } };
    }
    case 'move_block': {
      const from = asInt(args.from);
      const to = asInt(args.to);
      if (from === null || to === null) return { ok: false, error: 'move_block requires integer from/to.' };
      return { ok: true, mutation: { kind: 'move', from, to } };
    }
    case 'remove_block': {
      const index = asInt(args.index);
      if (index === null) return { ok: false, error: 'remove_block requires an integer index.' };
      return { ok: true, mutation: { kind: 'remove', index } };
    }
    case 'duplicate_block': {
      const index = asInt(args.index);
      if (index === null) return { ok: false, error: 'duplicate_block requires an integer index.' };
      return { ok: true, mutation: { kind: 'duplicate', index } };
    }
    default:
      return { ok: false, error: `Unknown tool "${name}".` };
  }
}

/** Authoritative per-target-block field + enum check, run by the route once the
 * real block type is known from the working layout. Returns an error string or null. */
export function validateUpdateFields(blockType: string, fields: Record<string, unknown>): string | null {
  const schema = getBlockSchema(blockType);
  if (!schema) return `Unknown block type "${blockType}".`;
  return checkFields(schema, fields);
}

// Cache the union of all field names across all blocks for update_block validation.
let allFieldNames: Set<string> | null = null;
function anyBlockHasField(name: string): boolean {
  if (!allFieldNames) {
    allFieldNames = new Set();
    // getBlockSchemas is sync + cached, already imported at the top.
    for (const s of getBlockSchemas()) {
      for (const f of s.fields) {
        allFieldNames.add(f.name);
      }
    }
  }
  return allFieldNames.has(name);
}
