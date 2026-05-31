import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/shopify';

export const runtime = 'nodejs';

export type SearchSuggestion = {
  handle: string;
  title: string;
  image: string;
  price: string;
  currencyCode: string;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const query = req.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const products = await getProducts({ query });
  const suggestions: SearchSuggestion[] = products.slice(0, 6).map((product) => ({
    handle: product.handle,
    title: product.title,
    image: product.featuredImage.url,
    price: product.priceRange.minVariantPrice.amount,
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
  }));

  return NextResponse.json({ suggestions });
}
