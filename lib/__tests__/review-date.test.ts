import { describe, expect, it } from 'vitest';
import { formatReviewDate } from '@/lib/review-date';

describe('formatReviewDate', () => {
  it('should format with the Vietnamese locale', () => {
    const out = formatReviewDate('2026-03-15T00:00:00Z', 'vi');
    expect(out).toMatch(/2026/);
  });
  it('should format with the English locale differently from Vietnamese', () => {
    const en = formatReviewDate('2026-03-15T00:00:00Z', 'en');
    const vi = formatReviewDate('2026-03-15T00:00:00Z', 'vi');
    expect(en).toMatch(/2026/);
    // en-US medium date includes an English month abbreviation
    expect(en).not.toBe(vi);
  });
});
