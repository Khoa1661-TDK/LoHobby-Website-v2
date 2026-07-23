import { describe, expect, it } from 'vitest';
import { hasActiveSearchFilters } from '@/lib/search-filters-active';

describe('hasActiveSearchFilters', () => {
  it('should be false with no filter params', () => {
    expect(hasActiveSearchFilters({ q: 'keychain', sort: 'newest' })).toBe(false);
  });
  it('should be true when a price bound is set', () => {
    expect(hasActiveSearchFilters({ price_min: '100' })).toBe(true);
    expect(hasActiveSearchFilters({ price_max: '500' })).toBe(true);
  });
  it('should be true when in-stock is set', () => {
    expect(hasActiveSearchFilters({ in_stock: '1' })).toBe(true);
  });
  it('should be false for empty or whitespace values', () => {
    expect(hasActiveSearchFilters({ price_min: '', price_max: '   ' })).toBe(false);
  });
});
