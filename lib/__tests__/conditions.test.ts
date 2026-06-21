// lib/__tests__/conditions.test.ts
import { describe, expect, it } from 'vitest';
import { isFieldVisible } from '@/lib/page-builder/conditions';
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

const custom: FieldDescriptor = {
  name: 'backgroundCustom',
  type: 'text',
  condition: { field: 'background', equals: 'custom' },
};

describe('isFieldVisible', () => {
  it('should hide a conditional field when the sibling value does not match', () => {
    expect(isFieldVisible(custom, { background: 'theme' })).toBe(false);
  });
  it('should show a conditional field when the sibling value matches', () => {
    expect(isFieldVisible(custom, { background: 'custom' })).toBe(true);
  });
  it('should always show fields without a condition', () => {
    expect(isFieldVisible({ name: 'headline', type: 'text' }, {})).toBe(true);
  });
});