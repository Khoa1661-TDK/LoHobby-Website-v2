// lib/page-builder/assistant/validate.ts — second-pass per-blockType validation.
import { getBlockSchema, getBlockSchemas, type BlockSchema, type FieldDescriptor } from '@/lib/page-builder/block-schemas';

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

/** Reject any field not declared by the block, and any enum value out of range. */
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
  }
  return null;
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
      return { ok: true, mutation: { kind: 'add', index, block: { blockType, ...fields } } };
    }
    case 'update_block': {
      const index = asInt(args.index);
      const fields = asRecord(args.fields);
      if (index === null) return { ok: false, error: 'update_block requires an integer index.' };
      // The target block's type is unknown server-side (we only have the snapshot),
      // so validate field NAMES against any block that declares them. If no block
      // declares a field, it is invalid. Per-block re-check happens client-side too.
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
