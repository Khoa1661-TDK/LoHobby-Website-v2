import type { Field } from 'payload';
import { describe, it, expect } from 'vitest';
import { brandingIdentityFields, footerContentFields } from '@/src/payload/globals/StoreSettings';
import { footerMenuField } from '@/src/payload/globals/Navigation';

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

describe('Navigation footerMenu export', () => {
  it('should export footerMenu as a hidden array field with heading + links subfields', () => {
    expect((footerMenuField as { name?: string }).name).toBe('footerMenu');
    expect((footerMenuField as { type?: string }).type).toBe('array');
    expect(isHidden(footerMenuField)).toBe(true);
    const sub = 'fields' in footerMenuField ? names(footerMenuField.fields) : [];
    expect(sub).toContain('heading');
    expect(sub).toContain('links');
  });
});
