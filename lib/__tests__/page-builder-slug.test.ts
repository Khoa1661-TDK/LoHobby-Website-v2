// lib/__tests__/page-builder-slug.test.ts
import { describe, expect, it } from 'vitest';
import { shouldPreserveSlug } from '@/lib/page-builder/slug';

describe('shouldPreserveSlug', () => {
  it('should preserve the stored slug when updating without a provided slug', () => {
    expect(
      shouldPreserveSlug({ operation: 'update', existingSlug: 'about-us', providedSlug: '' }),
    ).toBe(true);
  });

  it('should not preserve when the admin supplies an explicit new slug', () => {
    expect(
      shouldPreserveSlug({ operation: 'update', existingSlug: 'about-us', providedSlug: 'about' }),
    ).toBe(false);
  });

  it('should not preserve on create so a slug is generated from the title', () => {
    expect(
      shouldPreserveSlug({ operation: 'create', existingSlug: '', providedSlug: '' }),
    ).toBe(false);
  });

  it('should not preserve when there is no existing slug to keep', () => {
    expect(
      shouldPreserveSlug({ operation: 'update', existingSlug: '', providedSlug: '' }),
    ).toBe(false);
  });
});
