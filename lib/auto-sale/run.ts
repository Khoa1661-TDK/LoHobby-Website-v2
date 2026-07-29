// lib/auto-sale/run.ts — impure shell for the auto-sale job.
//
// Query -> rank -> select -> apply -> summarise. All policy lives in
// ./select.ts; this file only does I/O.
//
// Takes `payload` as a parameter rather than importing `@payload-config`:
// a top-level config import here would create a cycle through Products.ts
// (which imports ./select.ts) and TDZ-crash every Payload route.
import type { Payload } from 'payload';
import { prisma } from '@/lib/prisma';
import { countUniqueViewers } from '@/lib/analytics/product-metrics';
import { AUTO_SALE_WINDOW_DAYS } from '@/lib/constants';
import { AUTO_SALE_CONTEXT } from '@/lib/payload-hooks';
import { selectAutoSale, type AutoSaleCandidate } from '@/lib/auto-sale/select';

export type AutoSaleRunSummary = {
  ranAt: string;
  enabledCount: number;
  disabledCount: number;
  skippedCount: number;
  errorCount: number;
  enabledProducts: string;
  disabledProducts: string;
  error: string;
};

const EMPTY_SUMMARY = (): AutoSaleRunSummary => ({
  ranAt: new Date().toISOString(),
  enabledCount: 0,
  disabledCount: 0,
  skippedCount: 0,
  errorCount: 0,
  enabledProducts: '',
  disabledProducts: '',
  error: '',
});

function relationshipId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Ranked (productId, viewers) for the configured window, most-viewed first. */
async function rankByViewers(): Promise<ReturnType<typeof countUniqueViewers>> {
  const since = new Date(Date.now() - AUTO_SALE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // groupBy rather than findMany: ProductViewEvent is a high-write-volume table
  // and the database can do the dedupe without shipping a week of rows here.
  const pairs = await prisma.productViewEvent.groupBy({
    by: ['productId', 'sessionId'],
    where: { createdAt: { gte: since } },
    _count: true,
  });

  return countUniqueViewers(
    pairs.map((row) => ({
      productId: row.productId,
      sessionId: row.sessionId,
      _count: typeof row._count === 'number' ? row._count : 0,
    })),
  );
}

/** Every product, flattened into the shape the pure selector expects. */
async function loadCandidates(payload: Payload): Promise<AutoSaleCandidate[]> {
  const result = await payload.find({
    collection: 'products',
    limit: 0,
    pagination: false,
    depth: 1, // hydrate the `variants` join so per-variant stock is visible
  });

  return result.docs.map((doc) => {
    const variantDocs = Array.isArray((doc.variants as { docs?: unknown[] })?.docs)
      ? ((doc.variants as { docs: unknown[] }).docs as { stock?: unknown }[])
      : [];

    return {
      productId: String(doc.id),
      title: typeof doc.title === 'string' ? doc.title : String(doc.id),
      available: doc.available !== false,
      stock: toNumberOrNull(doc.stock),
      variantStocks: variantDocs.map((v) => toNumberOrNull(v.stock) ?? 0),
      onSale: doc.onSale === true,
      salePercent: toNumberOrNull(doc.salePercent),
      autoSaleManaged: doc.autoSaleManaged === true,
      releasedAt: typeof doc.autoSaleReleasedAt === 'string' ? doc.autoSaleReleasedAt : null,
    } satisfies AutoSaleCandidate;
  });
}

async function writeSummary(payload: Payload, summary: AutoSaleRunSummary): Promise<void> {
  try {
    await payload.updateGlobal({
      slug: 'auto-sale-settings',
      data: { lastRun: summary },
      depth: 0,
    });
  } catch (error) {
    console.error('[auto-sale] failed to write run summary:', error);
  }
}

/**
 * Reconcile the auto-sale set. Idempotent: it computes the desired state and
 * applies the difference, so a partial run self-heals on the next one.
 */
export async function runAutoSale(payload: Payload): Promise<AutoSaleRunSummary> {
  const summary = EMPTY_SUMMARY();

  let excludedProductIds: string[] = [];
  try {
    const settings = await payload.findGlobal({ slug: 'auto-sale-settings', depth: 0 });
    if (settings?.enabled === false) {
      console.info('[auto-sale] disabled in settings — skipping run');
      return summary;
    }
    excludedProductIds = Array.isArray(settings?.excludedProducts)
      ? settings.excludedProducts.map(relationshipId).filter((id): id is string => id !== null)
      : [];
  } catch (error) {
    summary.error = `settings load failed: ${(error as Error).message}`;
    console.error('[auto-sale] settings load failed:', error);
    await writeSummary(payload, summary);
    return summary;
  }

  // Ranking and catalogue load happen before any write, so a failure here
  // leaves the catalogue untouched.
  let plan;
  try {
    const [ranked, candidates] = await Promise.all([rankByViewers(), loadCandidates(payload)]);
    plan = selectAutoSale(ranked, candidates, excludedProductIds, Date.now());
  } catch (error) {
    summary.error = `ranking failed: ${(error as Error).message}`;
    console.error('[auto-sale] ranking failed:', error);
    await writeSummary(payload, summary);
    return summary;
  }

  summary.skippedCount = plan.skippedCount;

  // Disables first: a product leaving the sale set never briefly holds both
  // states, and the On Sale category churns once per product.
  for (const item of plan.toDisable) {
    try {
      await payload.update({
        collection: 'products',
        id: item.productId,
        data: { onSale: false, salePercent: null, autoSaleManaged: false },
        context: { ...AUTO_SALE_CONTEXT },
        depth: 0,
      });
      summary.disabledCount += 1;
    } catch (error) {
      summary.errorCount += 1;
      console.error(`[auto-sale] failed to clear sale on ${item.productId}:`, error);
    }
  }

  for (const item of plan.toEnable) {
    try {
      await payload.update({
        collection: 'products',
        id: item.productId,
        data: { onSale: true, salePercent: item.salePercent, autoSaleManaged: true },
        context: { ...AUTO_SALE_CONTEXT },
        depth: 0,
      });
      summary.enabledCount += 1;
    } catch (error) {
      summary.errorCount += 1;
      console.error(`[auto-sale] failed to set sale on ${item.productId}:`, error);
    }
  }

  summary.enabledProducts = plan.toEnable.map((i) => i.title).join(', ');
  summary.disabledProducts = plan.toDisable.map((i) => i.title).join(', ');

  console.info(
    `[auto-sale] enabled ${summary.enabledCount}, disabled ${summary.disabledCount}, skipped ${summary.skippedCount}, errors ${summary.errorCount}`,
  );

  await writeSummary(payload, summary);
  return summary;
}
