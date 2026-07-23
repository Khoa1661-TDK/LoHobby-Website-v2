// lib/shipping-quote.ts — pure shipping quote helpers (no Payload/Next imports)

export type ShippingZone = {
  name: string;
  regionKeywords: string[];
  flatRateVnd: number;
  freeShippingThresholdVnd: number;
};

export type ShippingQuoteSettings = {
  shipmentEnabled: boolean;
  flatRateVnd: number;
  freeShippingThresholdVnd: number;
  pickupEnabled: boolean;
  pickupAddress: string;
  pickupInstructions: string | null;
  zones: ShippingZone[];
};

export type ShippingQuote = {
  shippingAmount: number;
  pickupAddress: string;
  pickupInstructions: string | null;
  matchedZone: string | null;
};

type DeliveryMethod = 'SHIPMENT' | 'PICKUP';

/** Error shape for {@link computeShippingQuote}. `code` maps to `checkout.apiErrors`. */
export type ShippingQuoteError = {
  /** Vietnamese fallback / log message; the checkout route localizes via `code`. */
  error: string;
  code: 'pickupUnavailable' | 'shipmentUnavailable';
};

export function extractShippingRegion(address: string | null | undefined): string | null {
  if (typeof address !== 'string' || address.trim().length === 0) return null;
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] ?? null;
}

function matchShippingZone(
  settings: ShippingQuoteSettings,
  shippingRegion: string | null | undefined,
): ShippingZone | null {
  if (!shippingRegion || settings.zones.length === 0) return null;
  const normalized = shippingRegion.trim().toLowerCase();
  if (normalized.length === 0) return null;

  for (const zone of settings.zones) {
    for (const keyword of zone.regionKeywords) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        return zone;
      }
    }
  }
  return null;
}

function resolveRates(
  settings: ShippingQuoteSettings,
  shippingRegion: string | null | undefined,
): { flatRateVnd: number; freeShippingThresholdVnd: number; matchedZone: string | null } {
  const zone = matchShippingZone(settings, shippingRegion);
  if (zone) {
    return {
      flatRateVnd: zone.flatRateVnd,
      freeShippingThresholdVnd: zone.freeShippingThresholdVnd,
      matchedZone: zone.name,
    };
  }
  return {
    flatRateVnd: settings.flatRateVnd,
    freeShippingThresholdVnd: settings.freeShippingThresholdVnd,
    matchedZone: null,
  };
}

export function computeShippingQuote(
  settings: ShippingQuoteSettings,
  deliveryMethod: DeliveryMethod,
  subtotalVnd: number,
  shippingRegion?: string | null,
): ShippingQuote | ShippingQuoteError {
  if (deliveryMethod === 'PICKUP') {
    if (!settings.pickupEnabled) {
      return { error: 'Nhận tại cửa hàng hiện không khả dụng.', code: 'pickupUnavailable' };
    }
    return {
      shippingAmount: 0,
      pickupAddress: settings.pickupAddress,
      pickupInstructions: settings.pickupInstructions,
      matchedZone: null,
    };
  }

  if (!settings.shipmentEnabled) {
    return { error: 'Giao hàng tận nhà hiện không khả dụng.', code: 'shipmentUnavailable' };
  }

  const rates = resolveRates(settings, shippingRegion);
  let shippingAmount = rates.flatRateVnd;
  if (
    rates.freeShippingThresholdVnd > 0 &&
    subtotalVnd >= rates.freeShippingThresholdVnd
  ) {
    shippingAmount = 0;
  }

  return {
    shippingAmount,
    pickupAddress: settings.pickupAddress,
    pickupInstructions: settings.pickupInstructions,
    matchedZone: rates.matchedZone,
  };
}
