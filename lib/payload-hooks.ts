// lib/payload-hooks.ts — shared Payload hook helpers

/** Passed on product updates triggered by Media library resync hooks. */
export const MEDIA_RESYNC_CONTEXT = { fromMediaResync: true } as const;

/** Passed on the internal snapshot backfill update (afterChange) — skips other hooks. */
export const SNAPSHOT_BACKFILL_CONTEXT = { fromSnapshotBackfill: true } as const;

/** Passed when only inventoryAdjusted is written on Payload orders — skips inventory hook. */
export const ORDER_INVENTORY_CONTEXT = { fromOrderInventorySync: true } as const;

export function isMediaResync(req: { context?: Record<string, unknown> }): boolean {
  return req.context?.fromMediaResync === true;
}

export function isSnapshotBackfill(req: { context?: Record<string, unknown> }): boolean {
  return req.context?.fromSnapshotBackfill === true;
}

export function isOrderInventorySync(req: { context?: Record<string, unknown> }): boolean {
  return req.context?.fromOrderInventorySync === true;
}

/** True when the request is from a logged-in admin session (storefront reads have no user). */
export function isPayloadAdminRequest(req: {
  user?: unknown;
  url?: string | null;
  headers?: { get?: (name: string) => string | null };
}): boolean {
  if (req.user) return true;
  const url = typeof req.url === 'string' ? req.url : '';
  if (url.includes('/admin')) return true;
  const referer = req.headers?.get?.('referer') ?? '';
  return referer.includes('/admin');
}
