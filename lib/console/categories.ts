// lib/console/categories.ts
//
// Categories adapter for the admin console: a pure mapper over Payload
// category documents, plus a thin reader that fetches categories and product
// counts.

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Category } from '@/src/payload/payload-types';
import type { CategoryRow } from '@/components/console/categories/CategoryList';

const UNNAMED = 'Chưa đặt tên';

export function toCategoryRows(
  categories: Category[],
  counts: Map<number, number>,
): CategoryRow[] {
  return categories.map((cat) => ({
    id: String(cat.id),
    name: cat.title || UNNAMED,
    count: counts.get(cat.id) ?? 0,
    child: false,
  }));
}

export async function listCategoryRows(): Promise<CategoryRow[]> {
  const payload = await getPayload({ config });
  const [categories, products] = await Promise.all([
    payload.find({
      collection: 'categories',
      sort: 'title',
      limit: 0,
      pagination: false,
      depth: 0,
    }),
    payload.find({
      collection: 'products',
      limit: 0,
      pagination: false,
      depth: 0,
      select: { category: true },
    }),
  ]);

  const counts = new Map<number, number>();
  for (const product of products.docs) {
    const catIds = product.category;
    if (Array.isArray(catIds)) {
      for (const id of catIds) {
        if (typeof id === 'number') {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    }
  }

  return toCategoryRows(categories.docs, counts);
}
