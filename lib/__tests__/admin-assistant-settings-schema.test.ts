import { describe, expect, it } from 'vitest';
import {
  flattenGlobalFields,
  isRedactedPath,
  readByPath,
} from '@/lib/admin-assistant/settings-schema';

const fields = [
  { name: 'storeName', type: 'text', label: 'Store name' },
  { name: 'currency', type: 'select', options: [{ value: 'vnd', label: 'VND' }, { value: 'usd', label: 'USD' }] },
  { name: 'freeShipping', type: 'checkbox' },
  {
    name: 'contact',
    type: 'group',
    fields: [
      { name: 'email', type: 'email' },
      { name: 'zaloToken', type: 'text' },
    ],
  },
  { type: 'row', fields: [{ name: 'minOrder', type: 'number' }] },
  { name: 'blocks', type: 'blocks', blocks: [] },
  { name: 'items', type: 'array', fields: [{ name: 'x', type: 'text' }] },
];

describe('flattenGlobalFields', () => {
  it('should list scalar fields with their types', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat).toContainEqual({ path: 'storeName', type: 'text', label: 'Store name' });
    expect(flat).toContainEqual({ path: 'freeShipping', type: 'checkbox' });
  });

  it('should carry select option values', () => {
    const flat = flattenGlobalFields(fields);
    const currency = flat.find((f) => f.path === 'currency');
    expect(currency?.options).toEqual(['vnd', 'usd']);
  });

  it('should descend into groups with a dotted path', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'contact.email')).toBe(true);
  });

  it('should flatten presentational rows without adding a path segment', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'minOrder')).toBe(true);
  });

  it('should skip array and blocks fields, which are not scalar-editable', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'blocks')).toBe(false);
    expect(flat.some((f) => f.path.startsWith('items'))).toBe(false);
  });

  it('should omit redacted fields entirely', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'contact.zaloToken')).toBe(false);
  });
});

describe('isRedactedPath', () => {
  it('should redact credential-shaped names case-insensitively', () => {
    expect(isRedactedPath('apiKey')).toBe(true);
    expect(isRedactedPath('webhookUrl')).toBe(true);
    expect(isRedactedPath('contact.zaloToken')).toBe(true);
    expect(isRedactedPath('adminPassword')).toBe(true);
  });

  it('should leave ordinary names alone', () => {
    expect(isRedactedPath('storeName')).toBe(false);
    expect(isRedactedPath('freeShipping')).toBe(false);
  });
});

describe('readByPath', () => {
  it('should read a nested value', () => {
    expect(readByPath({ contact: { email: 'a@b.com' } }, 'contact.email')).toBe('a@b.com');
  });

  it('should return undefined for a missing path', () => {
    expect(readByPath({}, 'contact.email')).toBeUndefined();
  });
});
