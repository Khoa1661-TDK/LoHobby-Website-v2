import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/shopify';

export const runtime = 'nodejs';

export type CrossSellProduct = {
  id: string;
  handle: string;
  title: string;
  image: string;
  price: string;
  currencyCode: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const excludeParam = req.nextUrl.searchParams.get('exclude') ?? '';
  const exclude = new Set(
    excludeParam
      .split(',')
      .map((handle) => handle.trim())
      .filter(Boolean),
  );

  const products = await getProducts({ sortKey: 'BEST_SELLING' });
  const suggestions: CrossSellProduct[] = products
    .filter((product) => product.availableForSale && !exclude.has(product.handle))
    .slice(0, 4)
    .map((product) => ({
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.featuredImage.url,
      price: product.priceRange.minVariantPrice.amount,
      currencyCode: product.priceRange.minVariantPrice.currencyCode,
    }));

  return NextResponse.json({ suggestions });
}
