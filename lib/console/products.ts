// lib/console/products.ts
//
// Products adapter for the admin console: pure mappers over Payload product
// documents, plus thin readers that fetch and map.

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Product } from '@/src/payload/payload-types';
import type { ProductRow } from '@/components/console/products/ProductRowType';
import type { ProductEditorFacts } from '@/components/console/products/ProductEditor';
import { formatDayMonth } from './format';

const EM_DASH = '—';

const AUTO_DISCOUNT_NOTE = 'Quản lý bởi hệ thống tự động giảm giá';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveCategoryTitle(doc: Product): string {
  for (const entry of doc.category ?? []) {
    if (isRecord(entry) && typeof entry.title === 'string') return entry.title;
  }
  return EM_DASH;
}

function resolveStock(doc: Product): number {
  if (typeof doc.stock === 'number') return doc.stock;
  const docs = doc.variants?.docs ?? [];
  let total = 0;
  for (const variant of docs) {
    if (isRecord(variant) && typeof variant.stock === 'number') total += variant.stock;
  }
  return total;
}

function resolvePromo(doc: Product): string | null {
  if (doc.onSale !== true) return null;
  const percent = doc.salePercent ?? 0;
  return doc.autoSaleManaged === true ? `Tự động -${percent}%` : `-${percent}%`;
}

export function toProductRow(doc: Product): ProductRow {
  return {
    id: String(doc.id),
    name: doc.title,
    category: resolveCategoryTitle(doc),
    price: doc.price ?? 0,
    stock: resolveStock(doc),
    promo: resolvePromo(doc),
    autoDiscountNote: doc.autoSaleManaged === true ? AUTO_DISCOUNT_NOTE : null,
    status: doc.available === false ? 'draft' : 'listed',
    selected: false,
  };
}

export function toProductEditorFacts(doc: Product): ProductEditorFacts {
  return {
    title: doc.title,
    autoSaleManaged: `autoSaleManaged: ${Boolean(doc.autoSaleManaged)}`,
    autoSaleReleasedAt: `autoSaleReleasedAt: ${
      doc.autoSaleReleasedAt ? formatDayMonth(doc.autoSaleReleasedAt) : EM_DASH
    }`,
  };
}

export async function listProductRows(limit = 30): Promise<ProductRow[]> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'products',
    sort: '-updatedAt',
    limit,
    pagination: false,
    depth: 1,
  });
  return found.docs.map(toProductRow);
}

export async function countProducts(): Promise<number> {
  const payload = await getPayload({ config });
  const found = await payload.count({ collection: 'products' });
  return found.totalDocs;
}

export async function getProductEditorFacts(id: string): Promise<ProductEditorFacts | null> {
  try {
    const payload = await getPayload({ config });
    const doc = await payload.findByID({ collection: 'products', id: Number(id), depth: 1 });
    return toProductEditorFacts(doc);
  } catch {
    return null;
  }
}
