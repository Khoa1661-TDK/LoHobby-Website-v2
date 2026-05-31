import { describe, expect, it } from 'vitest';
import {
  computeShippingQuote,
  extractShippingRegion,
  type ShippingQuoteSettings,
} from '@/lib/shipping-quote';

const baseSettings: ShippingQuoteSettings = {
  shipmentEnabled: true,
  flatRateVnd: 30_000,
  freeShippingThresholdVnd: 500_000,
  pickupEnabled: true,
  pickupAddress: 'Pickup here',
  pickupInstructions: null,
  zones: [
    {
      name: 'HCM',
      regionKeywords: ['hồ chí minh', 'hcm', 'tp.hcm'],
      flatRateVnd: 15_000,
      freeShippingThresholdVnd: 300_000,
    },
  ],
};

describe('shipping-quote', () => {
  it('extracts region from address tail segment', () => {
    expect(extractShippingRegion('123 Nguyễn Huệ, Quận 1, Hồ Chí Minh')).toBe('Hồ Chí Minh');
  });

  it('applies regional zone rate when region matches', () => {
    const quote = computeShippingQuote(baseSettings, 'SHIPMENT', 100_000, 'Quận 1, HCM');
    expect(quote).toMatchObject({ shippingAmount: 15_000, matchedZone: 'HCM' });
  });

  it('waives shipping when zone free threshold is met', () => {
    const quote = computeShippingQuote(baseSettings, 'SHIPMENT', 350_000, 'HCM');
    expect(quote).toMatchObject({ shippingAmount: 0, matchedZone: 'HCM' });
  });

  it('returns zero shipping for pickup', () => {
    const quote = computeShippingQuote(baseSettings, 'PICKUP', 0, null);
    expect(quote).toMatchObject({ shippingAmount: 0 });
  });
});
