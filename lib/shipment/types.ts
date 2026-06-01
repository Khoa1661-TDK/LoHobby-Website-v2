// lib/shipment/types.ts — shared shipment status types

export type ShipmentStatus =
  | 'awaiting_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export type ShipmentEvent = {
  status: ShipmentStatus;
  message: string;
  location?: string | null;
  occurredAt: string;
};

export const SHIPMENT_STATUS_ORDER: readonly ShipmentStatus[] = [
  'awaiting_pickup',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
] as const;

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  awaiting_pickup: 'Chờ lấy hàng',
  picked_up: 'Đã lấy hàng',
  in_transit: 'Đang vận chuyển',
  out_for_delivery: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  failed: 'Giao thất bại',
};

export function shipmentStatusIndex(status: ShipmentStatus | null | undefined): number {
  if (!status || status === 'failed') return -1;
  return SHIPMENT_STATUS_ORDER.indexOf(status);
}

export function isTerminalShipmentStatus(status: ShipmentStatus | null | undefined): boolean {
  return status === 'delivered' || status === 'failed';
}
