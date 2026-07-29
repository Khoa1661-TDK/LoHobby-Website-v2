// lib/auto-sale/select.ts — PURE auto-sale policy: no DB, no Payload, no clock.
//
// Every eligibility rule lives here so it can be tested exhaustively without
// touching a database. See
// docs/superpowers/specs/2026-07-26-auto-sale-most-viewed-design.md.
import {
  AUTO_SALE_COOLDOWN_DAYS,
  AUTO_SALE_COUNT,
  AUTO_SALE_MIN_VIEWERS,
  AUTO_SALE_PERCENT,
} from '@/lib/constants';
import type { ProductViewers } from '@/lib/analytics/product-metrics';

/** A product as the selector sees it. `stock: null` means unlimited. */
export type AutoSaleCandidate = {
  productId: string;
  title: string;
  available: boolean;
  stock: number | null;
  /** Empty when the product has no variants; otherwise takes precedence over `stock`. */
  variantStocks: number[];
  onSale: boolean;
  salePercent: number | null;
  autoSaleManaged: boolean;
  /** ISO timestamp an admin removed a job-owned sale, or null. Drives the cooldown. */
  releasedAt: string | null;
};

export type AutoSalePlan = {
  toEnable: { productId: string; title: string; salePercent: number }[];
  toDisable: { productId: string; title: string }[];
  /** Ranked products that cleared the viewer floor but failed a later rail. */
  skippedCount: number;
};

/** Mirrors lib/inventory.ts: variant stock wins when variants exist. */
export function hasStock(candidate: AutoSaleCandidate): boolean {
  if (candidate.variantStocks.length > 0) {
    return candidate.variantStocks.some((stock) => stock > 0);
  }
  if (candidate.stock === null) return true;
  return candidate.stock > 0;
}

/** A sale an admin set by hand — the job must neither create nor clear it. */
function isManualSale(candidate: AutoSaleCandidate): boolean {
  return candidate.onSale && !candidate.autoSaleManaged;
}

/** True while an admin-removed product is still inside its cooldown window. */
export function inReleaseCooldown(candidate: AutoSaleCandidate, nowMs: number): boolean {
  if (!candidate.releasedAt) return false;
  const releasedMs = Date.parse(candidate.releasedAt);
  // An unparseable stamp must not exclude a product forever.
  if (!Number.isFinite(releasedMs)) return false;
  return nowMs - releasedMs < AUTO_SALE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

export function selectAutoSale(
  ranked: ProductViewers[],
  candidates: AutoSaleCandidate[],
  excludedProductIds: string[],
  nowMs: number,
): AutoSalePlan {
  const byId = new Map(candidates.map((c) => [c.productId, c]));
  const excluded = new Set(excludedProductIds);

  const toEnable: AutoSalePlan['toEnable'] = [];
  const chosen = new Set<string>();
  let skippedCount = 0;

  for (const entry of ranked) {
    if (chosen.size >= AUTO_SALE_COUNT) break;
    if (entry.viewers < AUTO_SALE_MIN_VIEWERS) break; // ranked descending — the rest are worse

    const candidate = byId.get(entry.productId);
    if (!candidate) continue; // ranked but no longer in the catalogue

    if (
      !candidate.available ||
      !hasStock(candidate) ||
      excluded.has(candidate.productId) ||
      isManualSale(candidate) ||
      inReleaseCooldown(candidate, nowMs) ||
      (candidate.salePercent ?? 0) > AUTO_SALE_PERCENT
    ) {
      skippedCount += 1;
      continue;
    }

    // Reach down the ranking when higher products are knocked out, but cap the
    // total sale set at AUTO_SALE_COUNT (including already-settled products).
    chosen.add(candidate.productId);

    const alreadySettled =
      candidate.onSale &&
      candidate.autoSaleManaged &&
      candidate.salePercent === AUTO_SALE_PERCENT;
    if (alreadySettled) continue; // settled product holds one of the capped slots

    toEnable.push({
      productId: candidate.productId,
      title: candidate.title,
      salePercent: AUTO_SALE_PERCENT,
    });
  }

  // Removal pass. Scoped to autoSaleManaged so it is structurally incapable of
  // clearing a sale the job did not create.
  const toDisable = candidates
    .filter((c) => c.autoSaleManaged && !chosen.has(c.productId))
    .map((c) => ({ productId: c.productId, title: c.title }));

  return { toEnable, toDisable, skippedCount };
}

/**
 * Whether a product save should hand ownership of its sale back to the admin.
 *
 * Any human edit to `onSale` or `salePercent` takes the product out of the
 * job's control, so the job never silently re-applies a sale someone removed
 * by hand. Writes made by the job itself are exempt.
 */
export function shouldReleaseAutoSale(args: {
  // Index signature: callers pass the full product `data`/`originalDoc` (many
  // other fields), and object literals in tests exercise unrelated fields too —
  // both need to satisfy this type without an excess-property error.
  incoming: { onSale?: unknown; salePercent?: unknown; [key: string]: unknown };
  original:
    | { onSale?: unknown; salePercent?: unknown; [key: string]: unknown }
    | undefined;
  isJobWrite: boolean;
}): boolean {
  const { incoming, original, isJobWrite } = args;
  if (isJobWrite || !original) return false;

  const onSaleChanged = incoming.onSale !== undefined && incoming.onSale !== original.onSale;
  const percentChanged =
    incoming.salePercent !== undefined && incoming.salePercent !== original.salePercent;

  return onSaleChanged || percentChanged;
}

/**
 * Whether this save should stamp a cooldown. Only a manual removal of a sale the
 * job owned qualifies: deepening a discount leaves the product `onSale` (already
 * covered by the manual-sale rail), and un-ticking a sale the job never owned is
 * not the job's business.
 */
export function shouldStartAutoSaleCooldown(args: {
  incoming: { onSale?: unknown; salePercent?: unknown; [key: string]: unknown };
  original: { onSale?: unknown; salePercent?: unknown; autoSaleManaged?: unknown; [key: string]: unknown } | undefined;
  isJobWrite: boolean;
}): boolean {
  const { incoming, original, isJobWrite } = args;
  if (isJobWrite || !original) return false;
  if (original.autoSaleManaged !== true) return false;
  return incoming.onSale === false && original.onSale === true;
}
