// lib/shipment/carriers.ts — Vietnam shipping carriers + tracking URL templates

export type ShipmentCarrierKey =
  | 'ghn'
  | 'ghtk'
  | 'viettel_post'
  | 'jt_express'
  | 'spx'
  | 'vnpost'
  | 'other';

export interface ShipmentCarrier {
  key: ShipmentCarrierKey;
  label: string;
  /** Public tracking page; `{tracking}` is replaced with the tracking number. */
  trackingUrlTemplate: string | null;
}

export const SHIPMENT_CARRIERS: readonly ShipmentCarrier[] = [
  {
    key: 'ghn',
    label: 'Giao Hàng Nhanh (GHN)',
    trackingUrlTemplate: 'https://donhang.ghn.vn/?order_code={tracking}',
  },
  {
    key: 'ghtk',
    label: 'Giao Hàng Tiết Kiệm (GHTK)',
    trackingUrlTemplate: 'https://i.ghtk.vn/{tracking}',
  },
  {
    key: 'viettel_post',
    label: 'Viettel Post',
    trackingUrlTemplate: 'https://viettelpost.com.vn/tracking?bill={tracking}',
  },
  {
    key: 'jt_express',
    label: 'J&T Express',
    trackingUrlTemplate: 'https://jtexpress.vn/vi/tracking?type=track&billcode={tracking}',
  },
  {
    key: 'spx',
    label: 'SPX Express',
    trackingUrlTemplate: 'https://spx.vn/track/{tracking}',
  },
  {
    key: 'vnpost',
    label: 'VNPost',
    trackingUrlTemplate: 'https://vnpost.com.vn/vi/tra-cuu-van-don?key={tracking}',
  },
  {
    key: 'other',
    label: 'Khác / tự nhập URL',
    trackingUrlTemplate: null,
  },
] as const;

const CARRIER_BY_KEY = new Map(
  SHIPMENT_CARRIERS.map((c) => [c.key, c]),
);

export function getShipmentCarrier(key: string): ShipmentCarrier | null {
  return CARRIER_BY_KEY.get(key as ShipmentCarrierKey) ?? null;
}

export function buildTrackingUrl(
  carrierKey: string,
  trackingNumber: string,
  customUrl?: string | null,
): string | null {
  const trimmed = trackingNumber.trim();
  if (!trimmed) return null;

  if (carrierKey === 'other') {
    const custom = customUrl?.trim();
    return custom && custom.length > 0 ? custom : null;
  }

  const carrier = getShipmentCarrier(carrierKey);
  if (!carrier?.trackingUrlTemplate) return null;

  return carrier.trackingUrlTemplate.replace(
    '{tracking}',
    encodeURIComponent(trimmed),
  );
}

export function carrierLabel(carrierKey: string | null | undefined): string {
  if (!carrierKey) return '';
  const carrier = getShipmentCarrier(carrierKey);
  return carrier?.label ?? carrierKey;
}
