import { describe, it, expect } from 'vitest';
import { stripSystemFields } from '@/lib/page-builder/save-chrome';

describe('stripSystemFields', () => {
  it('should drop payload system fields', () => {
    const out = stripSystemFields({
      id: 1,
      globalType: 'store-settings',
      createdAt: 'x',
      updatedAt: 'y',
      storeName: 'Shop',
    });
    expect(out).not.toHaveProperty('id');
    expect(out).not.toHaveProperty('globalType');
    expect(out).not.toHaveProperty('createdAt');
    expect(out).not.toHaveProperty('updatedAt');
  });

  it('should preserve every non-system field (untouched fields survive the round-trip)', () => {
    const out = stripSystemFields({
      id: 1,
      storeName: 'Shop',
      primaryColor: '#000',
      taxEnabled: true,
      socialLinks: [{ label: 'IG', url: 'https://x' }],
      footerShowNewsletter: false,
    });
    expect(out).toEqual({
      storeName: 'Shop',
      primaryColor: '#000',
      taxEnabled: true,
      socialLinks: [{ label: 'IG', url: 'https://x' }],
      footerShowNewsletter: false,
    });
  });

  it('should not mutate the input', () => {
    const input = { id: 1, storeName: 'Shop' };
    stripSystemFields(input);
    expect(input).toHaveProperty('id');
  });
});
