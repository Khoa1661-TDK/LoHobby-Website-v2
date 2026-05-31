// lib/tax.ts — automated tax calculation from store settings (VND integers)

export type TaxSettings = {
  taxEnabled: boolean;
  /** Whole-number percent (e.g. 10 = 10% VAT). */
  taxRatePercent: number;
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  taxEnabled: false,
  taxRatePercent: 10,
};

export function resolveTaxSettings(raw: {
  taxEnabled?: boolean | null;
  taxRatePercent?: number | null;
} | null): TaxSettings {
  const taxRatePercent =
    typeof raw?.taxRatePercent === 'number' && Number.isFinite(raw.taxRatePercent)
      ? Math.min(100, Math.max(0, Math.round(raw.taxRatePercent)))
      : DEFAULT_TAX_SETTINGS.taxRatePercent;

  return {
    taxEnabled: raw?.taxEnabled === true,
    taxRatePercent,
  };
}

/**
 * Compute tax on the taxable base (subtotal minus product discounts, before shipping).
 * Returns 0 when tax is disabled or the base is non-positive.
 */
export function computeTaxAmount(settings: TaxSettings, taxableBaseVnd: number): number {
  if (!settings.taxEnabled) return 0;
  const base = Math.max(0, Math.round(taxableBaseVnd));
  if (base <= 0) return 0;
  return Math.round((base * settings.taxRatePercent) / 100);
}
