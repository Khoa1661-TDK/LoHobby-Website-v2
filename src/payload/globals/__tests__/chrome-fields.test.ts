import type { Field } from 'payload';
import { describe, it, expect } from 'vitest';
import { brandingIdentityFields, footerContentFields } from '@/src/payload/globals/StoreSettings';

const names = (fields: Field[]) => fields.map((f) => (f as { name?: string }).name);
const isHidden = (f: Field) => (f as { admin?: { hidden?: boolean } }).admin?.hidden === true;

describe('StoreSettings chrome field groups', () => {
  it('should export branding identity fields flat (no row wrappers)', () => {
    expect(names(brandingIdentityFields)).toEqual([
      'storeName',
      'storeSubtitle',
      'logo',
      'logoDark',
      'favicon',
      'storeDescription',
      'storeDescriptionShort',
    ]);
  });

  it('should export footer content fields flat including contact and social', () => {
    expect(names(footerContentFields)).toEqual([
      'footerTagline',
      'brandOrigin',
      'footerDescription',
      'footerCredit',
      'footerShowNewsletter',
      'contactEmail',
      'contactPhone',
      'contactAddress',
      'socialLinks',
    ]);
  });

  it('should mark every exported chrome field admin.hidden', () => {
    for (const f of [...brandingIdentityFields, ...footerContentFields]) {
      expect(isHidden(f), `${(f as { name?: string }).name} should be admin.hidden`).toBe(true);
    }
  });
});
