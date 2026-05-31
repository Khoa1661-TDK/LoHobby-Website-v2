import { describe, expect, it } from 'vitest';
import { formatGiftCardBalance, generateGiftCardCode } from '@/lib/gift-card-format';

describe('gift-card-format', () => {
  it('formats VND balance', () => {
    expect(formatGiftCardBalance(100_000)).toContain('100');
    expect(formatGiftCardBalance(100_000)).toContain('₫');
  });

  it('generates gift card codes with prefix', () => {
    const code = generateGiftCardCode();
    expect(code.startsWith('GC-')).toBe(true);
    expect(code.length).toBeGreaterThanOrEqual(10);
  });
});
