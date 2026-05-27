// lib/slugify.ts — URL-safe slugs with Vietnamese diacritics stripped
import type { CollectionSlug, Payload } from 'payload';

export function slugifyVietnamese(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function uniqueCollectionSlug(
  payload: Payload,
  collection: CollectionSlug,
  baseSlug: string,
  excludeId?: string | number,
): Promise<string> {
  const normalized = slugifyVietnamese(baseSlug);
  if (!normalized) {
    throw new Error('Cannot generate slug from empty title');
  }

  let candidate = normalized;
  let suffix = 2;

  while (true) {
    const existing = await payload.find({
      collection,
      where: { slug: { equals: candidate } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
      depth: 0,
    });

    const doc = existing.docs[0];
    if (!doc || (excludeId !== undefined && doc.id === excludeId)) {
      return candidate;
    }

    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }
}

/** Use an explicit slug when provided; otherwise derive one from the title. */
export async function resolveCollectionSlug(
  payload: Payload,
  collection: CollectionSlug,
  input: {
    title?: string | null;
    slug?: string | null;
    excludeId?: string | number;
  },
): Promise<string | undefined> {
  const provided = typeof input.slug === 'string' ? input.slug.trim() : '';
  const base = provided || (typeof input.title === 'string' ? input.title : '');
  const normalized = slugifyVietnamese(base);
  if (!normalized) return undefined;
  return uniqueCollectionSlug(payload, collection, normalized, input.excludeId);
}
