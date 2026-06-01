// lib/shipment/tracking-provider.ts — resolve shipment status from carrier or time-based progression

import type { ShipmentEvent, ShipmentStatus } from '@/lib/shipment/types';
import { SHIPMENT_STATUS_LABELS } from '@/lib/shipment/types';

/** Minutes after shippedAt before each stage is reached (demo / mock tracking). */
const DEFAULT_STAGE_MINUTES: Record<ShipmentStatus, number> = {
  awaiting_pickup: 0,
  picked_up: 0,
  in_transit: 15,
  out_for_delivery: 60,
  delivered: 180,
  failed: Number.POSITIVE_INFINITY,
};

function parseStageMinutes(): Record<ShipmentStatus, number> {
  const raw = process.env.SHIPMENT_STAGE_MINUTES?.trim();
  if (!raw) return DEFAULT_STAGE_MINUTES;

  const result = { ...DEFAULT_STAGE_MINUTES };
  for (const part of raw.split(',')) {
    const [key, value] = part.split(':').map((s) => s.trim());
    if (!key || !value) continue;
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes < 0) continue;
    if (key in result) {
      result[key as ShipmentStatus] = minutes;
    }
  }
  return result;
}

const STAGE_MINUTES = parseStageMinutes();

const STAGE_MESSAGES: Record<ShipmentStatus, string> = {
  awaiting_pickup: 'Đơn hàng đã tạo vận đơn, chờ đơn vị vận chuyển lấy hàng.',
  picked_up: 'Đơn vị vận chuyển đã lấy hàng tại kho.',
  in_transit: 'Kiện hàng đang trên đường vận chuyển.',
  out_for_delivery: 'Shipper đang giao hàng trong ngày.',
  delivered: 'Giao hàng thành công.',
  failed: 'Giao hàng thất bại.',
};

const STAGE_LOCATIONS: Partial<Record<ShipmentStatus, string>> = {
  picked_up: 'Kho xuất hàng',
  in_transit: 'Trung tâm phân loại',
  out_for_delivery: 'Khu vực giao hàng',
  delivered: 'Địa chỉ nhận hàng',
};

export type TrackingLookupInput = {
  carrierKey: string;
  trackingNumber: string;
  shippedAt: string | Date | null;
  currentStatus?: ShipmentStatus | null;
};

export type TrackingLookupResult = {
  status: ShipmentStatus;
  events: ShipmentEvent[];
  source: 'mock' | 'carrier_api';
};

/**
 * Resolves the current shipment status. Uses time-based progression when no carrier API
 * credentials are configured (default). Replace `fetchCarrierApiStatus` when wiring GHN/GHTK APIs.
 */
export async function lookupShipmentStatus(
  input: TrackingLookupInput,
): Promise<TrackingLookupResult> {
  const apiResult = await fetchCarrierApiStatus(input);
  if (apiResult) return apiResult;

  return buildMockProgression(input);
}

async function fetchCarrierApiStatus(
  _input: TrackingLookupInput,
): Promise<TrackingLookupResult | null> {
  // Placeholder for real carrier API integration (GHN, GHTK, etc.)
  const enabled = process.env.SHIPMENT_CARRIER_API_ENABLED === 'true';
  if (!enabled) return null;
  return null;
}

function buildMockProgression(input: TrackingLookupInput): TrackingLookupResult {
  const shippedAt = input.shippedAt ? new Date(input.shippedAt) : new Date();
  const elapsedMinutes = Math.max(0, (Date.now() - shippedAt.getTime()) / 60_000);

  const stages: ShipmentStatus[] = [
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
  ];

  let resolved: ShipmentStatus = 'picked_up';
  for (const stage of stages) {
    if (elapsedMinutes >= STAGE_MINUTES[stage]) {
      resolved = stage;
    }
  }

  const events = buildEventsUpTo(resolved, shippedAt);
  return { status: resolved, events, source: 'mock' };
}

function buildEventsUpTo(
  targetStatus: ShipmentStatus,
  shippedAt: Date,
): ShipmentEvent[] {
  const sequence: ShipmentStatus[] = [
    'awaiting_pickup',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
  ];

  const targetIndex = sequence.indexOf(targetStatus);
  const events: ShipmentEvent[] = [];

  for (let i = 0; i <= targetIndex; i += 1) {
    const status = sequence[i];
    if (!status) continue;
    const minutes = STAGE_MINUTES[status];
    events.push({
      status,
      message: STAGE_MESSAGES[status],
      location: STAGE_LOCATIONS[status] ?? null,
      occurredAt: new Date(shippedAt.getTime() + minutes * 60_000).toISOString(),
    });
  }

  return events;
}

export function mergeShipmentEvents(
  existing: ShipmentEvent[] | null | undefined,
  incoming: ShipmentEvent[],
): ShipmentEvent[] {
  const byStatus = new Map<ShipmentStatus, ShipmentEvent>();

  for (const event of existing ?? []) {
    byStatus.set(event.status, event);
  }
  for (const event of incoming) {
    const prev = byStatus.get(event.status);
    if (!prev || new Date(event.occurredAt) >= new Date(prev.occurredAt)) {
      byStatus.set(event.status, event);
    }
  }

  const order: ShipmentStatus[] = [
    'awaiting_pickup',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
  ];

  return order
    .filter((s) => byStatus.has(s))
    .map((s) => byStatus.get(s)!);
}

export { SHIPMENT_STATUS_LABELS };
