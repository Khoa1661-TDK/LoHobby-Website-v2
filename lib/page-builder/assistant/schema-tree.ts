// lib/page-builder/assistant/schema-tree.ts — shared shaping of block field descriptors
// for the AI assistant. Both the model-facing contract and the server-side validator walk
// the same tree, so the rules for what the model may see and write live here once.
import { appearanceFields } from '@/src/payload/blocks/_appearance';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

/** Identity fields the model must never see or write. `blockKey` is ours (it links the two
 * locale copies of a block); `id` is injected into every array by Payload itself — calling
 * getPayload() mutates the shared Block definitions in place. A model that writes row ids
 * trips the localized-save "Value must be unique: id" collision. */
const HIDDEN_FIELD_NAMES: ReadonlySet<string> = new Set(['id', 'blockKey']);

/** Names of the appearance group every block shares. Derived from the actual field
 * definitions rather than hardcoded, so adding an appearance knob can't silently
 * desynchronise the contract. */
export const APPEARANCE_FIELD_NAMES: ReadonlySet<string> = new Set(
  appearanceFields
    .map((f) => ('name' in f && typeof f.name === 'string' ? f.name : ''))
    .filter((name) => name.length > 0),
);

/** Strip hidden identity fields at every depth. Returns new arrays; inputs are untouched. */
export function contentFields(fields: FieldDescriptor[]): FieldDescriptor[] {
  return fields
    .filter((f) => !HIDDEN_FIELD_NAMES.has(f.name))
    .map((f) => (f.fields ? { ...f, fields: contentFields(f.fields) } : f));
}

/** Split a block's fields into the ones unique to it and the shared appearance group.
 * The appearance group is documented once in the system prompt, so per-block descriptions
 * only need to cover `own`. */
export function splitAppearance(fields: FieldDescriptor[]): {
  own: FieldDescriptor[];
  appearance: FieldDescriptor[];
} {
  const visible = contentFields(fields);
  return {
    own: visible.filter((f) => !APPEARANCE_FIELD_NAMES.has(f.name)),
    appearance: visible.filter((f) => APPEARANCE_FIELD_NAMES.has(f.name)),
  };
}
