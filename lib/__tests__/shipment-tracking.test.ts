// lib/__tests__/shipment-tracking.test.ts
import { describe, expect, it } from 'vitest';
import { buildTrackingUrl, getShipmentCarrier } from '@/lib/shipment/carriers';
import { lookupShipmentStatus, mergeShipmentEvents } from '@/lib/shipment/tracking-provider';
import type { ShipmentEvent } from '@/lib/shipment/types';

describe('buildTrackingUrl', () => {
  it('builds GHN tracking URL from tracking number', () => {
    const url = buildTrackingUrl('ghn', 'ABC123');
    expect(url).toContain('ABC123');
    expect(url).toContain('ghn.vn');
  });

  it('returns null for empty tracking number', () => {
    expect(buildTrackingUrl('ghn', '  ')).toBeNull();
  });

  it('requires custom URL for other carrier', () => {
    expect(buildTrackingUrl('other', 'X1', null)).toBeNull();
    expect(buildTrackingUrl('other', 'X1', 'https://track.example/x1')).toBe(
      'https://track.example/x1',
    );
  });
});

describe('getShipmentCarrier', () => {
  it('returns known carriers', () => {
    expect(getShipmentCarrier('ghtk')?.label).toContain('GHTK');
  });
});

describe('lookupShipmentStatus', () => {
  it('progresses to delivered after enough time', async () => {
    const shippedAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const result = await lookupShipmentStatus({
      carrierKey: 'ghn',
      trackingNumber: 'TEST123',
      shippedAt,
    });
    expect(result.status).toBe('delivered');
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('starts at picked_up for recent shipments', async () => {
    const result = await lookupShipmentStatus({
      carrierKey: 'ghn',
      trackingNumber: 'NEW123',
      shippedAt: new Date(),
    });
    expect(result.status).toBe('picked_up');
  });
});

describe('mergeShipmentEvents', () => {
  it('merges events by status keeping latest timestamp', () => {
    const existing: ShipmentEvent[] = [
      {
        status: 'picked_up',
        message: 'Old',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const incoming: ShipmentEvent[] = [
      {
        status: 'picked_up',
        message: 'New',
        occurredAt: '2026-01-02T00:00:00.000Z',
      },
      {
        status: 'in_transit',
        message: 'Moving',
        occurredAt: '2026-01-02T01:00:00.000Z',
      },
    ];
    const merged = mergeShipmentEvents(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.message).toBe('New');
    expect(merged[1]?.status).toBe('in_transit');
  });
});
