// lib/admin-product-doc.ts — normalize product docs for the Payload admin form (prevents save loops)

import { omitSnapshotFieldsFromDoc } from '@/lib/product-snapshot-patch';

function coerceRelationshipId(value: unknown): unknown {
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return value;
}

function relationshipToId(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    return coerceRelationshipId(value);
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return coerceRelationshipId((value as { id: unknown }).id);
  }
  return value;
}

/**
 * Strip server-only snapshot fields and collapse populated upload/relationship values to
 * numeric IDs so the admin form state matches what the client submits (avoids autosave loops).
 */
export function sanitizeProductDocForAdmin(doc: Record<string, unknown>): Record<string, unknown> {
  const next = omitSnapshotFieldsFromDoc(doc);

  next.image = relationshipToId(next.image);

  if (Array.isArray(next.category)) {
    next.category = next.category
      .map(relationshipToId)
      .filter((id) => id !== null && id !== undefined);
  }

  if (Array.isArray(next.gallery)) {
    next.gallery = next.gallery.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const row = item as Record<string, unknown>;
      const normalized: Record<string, unknown> = {
        media: relationshipToId(row.media),
      };
      if (row.id !== undefined && row.id !== null) {
        normalized.id = row.id;
      }
      return normalized;
    });
  }

  if (Array.isArray(next.variants)) {
    next.variants = next.variants
      .map((variant) => {
        if (variant === null || variant === undefined) return variant;
        if (typeof variant === 'string' || typeof variant === 'number') return variant;
        if (typeof variant !== 'object') return variant;
        const row = { ...(variant as Record<string, unknown>) };
        row.image = relationshipToId(row.image);
        row.product = relationshipToId(row.product);
        delete row.storedImage;
        return row;
      })
      .filter((variant) => variant !== null && variant !== undefined);
  } else if (
    next.variants &&
    typeof next.variants === 'object' &&
    Array.isArray((next.variants as { docs?: unknown }).docs)
  ) {
    const join = next.variants as { docs: unknown[] };
    join.docs = join.docs.map((variant) => {
      if (variant === null || variant === undefined) return variant;
      if (typeof variant !== 'object') return variant;
      const row = { ...(variant as Record<string, unknown>) };
      row.image = relationshipToId(row.image);
      row.product = relationshipToId(row.product);
      delete row.storedImage;
      return row;
    });
  }

  if (next.meta && typeof next.meta === 'object') {
    const meta = { ...(next.meta as Record<string, unknown>) };
    meta.image = relationshipToId(meta.image);
    next.meta = meta;
  }

  return next;
}
