import { describe, expect, it } from 'vitest';
import { isLocale, routing } from '@/i18n/routing';
import { isNonLocalizedRoot } from '@/lib/locale-routing';

describe('routing config', () => {
  it('should expose vi and en as the supported locales', () => {
    expect(routing.locales).toEqual(['vi', 'en']);
  });

  it('should default to Vietnamese', () => {
    expect(routing.defaultLocale).toBe('vi');
  });

  it('should always show the locale prefix', () => {
    expect(routing.localePrefix).toBe('always');
  });
});

describe('isLocale', () => {
  it('should accept a supported locale', () => {
    expect(isLocale('vi')).toBe(true);
    expect(isLocale('en')).toBe(true);
  });

  it('should reject an unsupported value', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('products')).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});

describe('isNonLocalizedRoot', () => {
  it('should bypass the legacy /products route and its children', () => {
    expect(isNonLocalizedRoot('/products')).toBe(true);
    expect(isNonLocalizedRoot('/products/ao-thun')).toBe(true);
  });

  it('should bypass extension-less metadata routes', () => {
    expect(isNonLocalizedRoot('/icon')).toBe(true);
    expect(isNonLocalizedRoot('/opengraph-image')).toBe(true);
  });

  it('should not bypass localizable storefront paths', () => {
    expect(isNonLocalizedRoot('/')).toBe(false);
    expect(isNonLocalizedRoot('/product/ao-thun')).toBe(false);
    expect(isNonLocalizedRoot('/checkout')).toBe(false);
    expect(isNonLocalizedRoot('/blog')).toBe(false);
  });

  it('should not bypass paths that merely start with a prefix word', () => {
    // `/products-archive` is a distinct path, not under `/products`.
    expect(isNonLocalizedRoot('/products-archive')).toBe(false);
  });

  it('should treat /health as a non-localized root so it bypasses locale prefixing', () => {
    expect(isNonLocalizedRoot('/health')).toBe(true);
  });

  it('should still localize a normal storefront path', () => {
    expect(isNonLocalizedRoot('/products-listing')).toBe(false);
  });

  it('should keep treating /products as non-localized', () => {
    expect(isNonLocalizedRoot('/products')).toBe(true);
  });
});
