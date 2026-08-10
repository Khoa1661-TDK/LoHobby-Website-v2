// lib/admin-assistant/settings-schema.ts — describe a Payload global's writable scalar
// fields by walking the live config. Deliberately not a hardcoded list: a hardcoded schema
// probe elsewhere in this project drifted silently out of sync with the real fields.
import type { BasePayload } from 'payload';

export type FieldDescriptor = {
  path: string;
  type: string;
  label?: string;
  options?: string[];
};

/** Scalar field types the assistant is allowed to read and propose changes to. */
const SCALAR_TYPES = ['text', 'textarea', 'email', 'number', 'checkbox', 'select', 'radio', 'date'];

/** Presentational wrappers that hold fields but contribute no path segment. */
const TRANSPARENT_TYPES = ['row', 'collapsible', 'unnamedTab'];

/** Substrings that mark a credential. Lowercase comparison, no regex — a bracketed
 *  character class in lib/ breaks the Tailwind build. */
const REDACTED_PARTS = ['token', 'secret', 'key', 'password', 'webhook'];

export function isRedactedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return REDACTED_PARTS.some((part) => lower.includes(part));
}

function optionValues(field: Record<string, unknown>): string[] | undefined {
  const options = field.options;
  if (!Array.isArray(options)) return undefined;
  const values: string[] = [];
  for (const option of options) {
    if (typeof option === 'string') values.push(option);
    else if (option && typeof option === 'object') {
      const value = (option as Record<string, unknown>).value;
      if (typeof value === 'string') values.push(value);
    }
  }
  return values.length > 0 ? values : undefined;
}

/** Walk a global's field list into flat dotted descriptors. Arrays and blocks are skipped:
 *  they are row structures, not scalar options, and belong in the visual editors. */
export function flattenGlobalFields(fields: unknown[], prefix = ''): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue;
    const field = raw as Record<string, unknown>;
    const type = typeof field.type === 'string' ? field.type : '';
    const name = typeof field.name === 'string' ? field.name : '';

    if (TRANSPARENT_TYPES.includes(type) && Array.isArray(field.fields)) {
      out.push(...flattenGlobalFields(field.fields, prefix));
      continue;
    }

    if (type === 'group' && name && Array.isArray(field.fields)) {
      out.push(...flattenGlobalFields(field.fields, prefix ? `${prefix}.${name}` : name));
      continue;
    }

    if (!name || !SCALAR_TYPES.includes(type)) continue;

    const path = prefix ? `${prefix}.${name}` : name;
    if (isRedactedPath(path)) continue;

    const descriptor: FieldDescriptor = { path, type };
    if (typeof field.label === 'string') descriptor.label = field.label;
    const options = optionValues(field);
    if (options) descriptor.options = options;
    out.push(descriptor);
  }
  return out;
}

/** Pull one global's field list off the live config. Returns [] for an unknown slug. */
export function getGlobalFields(payload: BasePayload, slug: string): unknown[] {
  const globals = payload.config.globals as Array<{ slug: string; fields: unknown[] }>;
  const match = globals.find((global) => global.slug === slug);
  return match ? match.fields : [];
}

/** Read a dotted path out of a plain object. */
export function readByPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
