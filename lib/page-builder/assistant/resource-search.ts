// lib/page-builder/assistant/resource-search.ts — lookups that let the assistant bind real
// ids. Previously the route dumped up to 100 category/product ids into every system prompt,
// which both capped the reachable catalog and cost ~4k tokens per turn. These are on-demand
// tools instead. Failures are non-fatal: an empty result tells the model to leave the field
// unbound rather than aborting the run.
import type { getPayload } from 'payload';

type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

/** Upper bound on results, so one search can't flood the context window. */
const MAX_LIMIT = 50;

export type MediaResult = {
  id: number | string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type CatalogResult = { id: number | string; title: string };

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 10;
  return Math.min(Math.trunc(limit), MAX_LIMIT);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/** Find media by filename or alt text. An empty query returns the most recent uploads. */
export async function searchMedia(
  payload: PayloadClient,
  query: string,
  limit: number,
): Promise<MediaResult[]> {
  const trimmed = query.trim();
  try {
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: clampLimit(limit),
      sort: '-createdAt',
      ...(trimmed
        ? { where: { or: [{ filename: { like: trimmed } }, { alt: { like: trimmed } }] } }
        : {}),
    });
    return result.docs.map((doc) => {
      const d = doc as unknown as Record<string, unknown>;
      return {
        id: d.id as number | string,
        filename: str(d.filename),
        alt: str(d.alt),
        width: num(d.width),
        height: num(d.height),
      };
    });
  } catch {
    return [];
  }
}

/** Find products or categories by title, in the given locale. */
export async function searchCatalog(
  payload: PayloadClient,
  collection: 'products' | 'categories',
  query: string,
  limit: number,
  locale: string,
): Promise<CatalogResult[]> {
  const trimmed = query.trim();
  try {
    const result = await payload.find({
      collection,
      depth: 0,
      limit: clampLimit(limit),
      locale: locale as never,
      select: { title: true },
      ...(trimmed ? { where: { title: { like: trimmed } } } : {}),
    });
    return result.docs.map((doc) => {
      const d = doc as unknown as Record<string, unknown>;
      return { id: d.id as number | string, title: str(d.title) || `#${String(d.id)}` };
    });
  } catch {
    return [];
  }
}
