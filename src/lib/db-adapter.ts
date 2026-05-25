// src/lib/db-adapter.ts
import type { Product as PrismaProduct } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export { prisma };

// ---------- Vercel Commerce UI contract ----------
export type Money = { amount: string; currencyCode: string };
export type UIImage = { url: string; altText: string; width: number; height: number };
export type UIVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: Money;
};
export type UIProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  options: { id: string; name: string; values: string[] }[];
  priceRange: { maxVariantPrice: Money; minVariantPrice: Money };
  variants: UIVariant[];
  featuredImage: UIImage;
  images: UIImage[];
  seo: { title: string; description: string };
  tags: string[];
  updatedAt: string;
};

const PLACEHOLDER = '/images/placeholder.svg';

const toImage = (url: string, alt: string): UIImage => ({
  url,
  altText: alt,
  width: 1200,
  height: 1200,
});

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );

export function mapProduct(p: PrismaProduct): UIProduct {
  const price: Money = { amount: p.priceVnd.toString(), currencyCode: p.currency };
  const imgs: UIImage[] =
    p.images.length > 0
      ? p.images.map((u) => toImage(u, p.title))
      : [toImage(PLACEHOLDER, p.title)];

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    descriptionHtml: `<p>${escapeHtml(p.description)}</p>`,
    availableForSale: p.available,
    options: [],
    priceRange: { maxVariantPrice: price, minVariantPrice: price },
    variants: [
      {
        id: p.id,
        title: 'Default',
        availableForSale: p.available,
        selectedOptions: [],
        price,
      },
    ],
    featuredImage: imgs[0]!,
    images: imgs,
    seo: { title: p.title, description: p.description },
    tags: p.tags,
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ---------- Query helpers used by storefront pages ----------
export async function getProducts(opts?: {
  query?: string;
  limit?: number;
  sortKey?: 'createdAt' | 'priceVnd' | 'title';
  reverse?: boolean;
}): Promise<UIProduct[]> {
  const sortKey = opts?.sortKey ?? 'createdAt';
  const orderBy = { [sortKey]: opts?.reverse ? 'asc' : 'desc' } as const;

  const rows = await prisma.product.findMany({
    where: opts?.query
      ? {
          OR: [
            { title: { contains: opts.query, mode: 'insensitive' } },
            { description: { contains: opts.query, mode: 'insensitive' } },
            { tags: { has: opts.query } },
          ],
        }
      : undefined,
    take: opts?.limit ?? 100,
    orderBy,
  });
  return rows.map(mapProduct);
}

export async function getProduct(handle: string): Promise<UIProduct | null> {
  const row = await prisma.product.findUnique({ where: { handle } });
  return row ? mapProduct(row) : null;
}

export async function getProductById(id: string): Promise<UIProduct | null> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? mapProduct(row) : null;
}

export async function getProductsByTag(tag: string): Promise<UIProduct[]> {
  const rows = await prisma.product.findMany({ where: { tags: { has: tag } } });
  return rows.map(mapProduct);
}
