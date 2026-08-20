import { describe, expect, it } from 'vitest';
import { isNavItemActive } from '@/components/console/nav';

describe('isNavItemActive', () => {
  it('treats an exact href match as active', () => {
    expect(isNavItemActive('/admin/console/orders', '/admin/console/orders')).toBe(true);
  });

  it('treats a child path as active', () => {
    expect(isNavItemActive('/admin/console/orders/123', '/admin/console/orders')).toBe(true);
  });

  it('does not treat a sibling prefix as active', () => {
    expect(isNavItemActive('/admin/console/orders-archive', '/admin/console/orders')).toBe(
      false,
    );
  });

  it('does not treat an unrelated path as active', () => {
    expect(isNavItemActive('/admin/console/products', '/admin/console/orders')).toBe(false);
  });
});
