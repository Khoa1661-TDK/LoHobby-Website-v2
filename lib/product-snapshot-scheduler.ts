// lib/product-snapshot-scheduler.ts — debounce product snapshot backfill (avoids admin save loops)

import { after } from 'next/server';

const DEBOUNCE_MS = 2500;

/** Latest scheduled deadline per product id (ms since epoch). */
const scheduledDeadlines = new Map<string | number, number>();

/**
 * Run `run` once, DEBOUNCE_MS after the last call for the same product.
 * Uses Next `after()` so work continues after the admin response is sent.
 */
export function scheduleDebouncedProductSnapshotBackfill(
  productId: string | number,
  run: () => Promise<void>,
): void {
  const deadline = Date.now() + DEBOUNCE_MS;
  scheduledDeadlines.set(productId, deadline);

  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));
    if (scheduledDeadlines.get(productId) !== deadline) return;
    scheduledDeadlines.delete(productId);
    await run();
  });
}
