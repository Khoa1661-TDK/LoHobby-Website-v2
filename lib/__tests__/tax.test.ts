import { describe, expect, it } from 'vitest';
import { computeTaxAmount, resolveTaxSettings } from '@/lib/tax';

describe('tax', () => {
  it('returns zero when tax is disabled', () => {
    expect(computeTaxAmount({ taxEnabled: false, taxRatePercent: 10 }, 100_000)).toBe(0);
  });

  it('computes percentage tax on taxable base', () => {
    expect(
      computeTaxAmount({ taxEnabled: true, taxRatePercent: 10 }, 250_000),
    ).toBe(25_000);
  });

  it('clamps invalid rate from settings', () => {
    expect(resolveTaxSettings({ taxEnabled: true, taxRatePercent: 150 }).taxRatePercent).toBe(
      100,
    );
  });
});
