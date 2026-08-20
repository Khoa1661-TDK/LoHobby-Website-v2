// lib/__tests__/console-settings.test.ts
import { describe, it, expect } from 'vitest';
import { toBrandFacts } from '@/lib/console/settings';

describe('toBrandFacts', () => {
  it('should map a fully populated global to brand facts', () => {
    expect(
      toBrandFacts({
        storeName: 'Lô Hobby',
        storeSubtitle: 'Mô hình & móc khóa in 3D',
        logo: { url: '/media/logo.png', alt: 'Lô Hobby' },
        primaryColor: '#111111',
        secondaryColor: '#f5f5f5',
        accentColor: '#146138',
      }),
    ).toEqual({
      storeName: 'Lô Hobby',
      storeSubtitle: 'Mô hình & móc khóa in 3D',
      logoUrl: '/media/logo.png',
      logoAlt: 'Lô Hobby',
      colors: { primary: '#111111', secondary: '#f5f5f5', accent: '#146138' },
    });
  });

  it('should fall back to placeholder copy when the global is empty', () => {
    expect(toBrandFacts({})).toEqual({
      storeName: 'Chưa đặt tên cửa hàng',
      storeSubtitle: 'Chưa có mô tả ngắn',
      logoUrl: null,
      logoAlt: '',
      colors: { primary: '#000000', secondary: '#737373', accent: '#146138' },
    });
  });

  it('should return no logo url when the logo relationship is an unresolved id', () => {
    expect(toBrandFacts({ logo: 12 }).logoUrl).toBeNull();
  });

  it('should tolerate a null global', () => {
    expect(toBrandFacts(null).storeName).toBe('Chưa đặt tên cửa hàng');
  });
});
