import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPersonalizedRecommendations } from '@/lib/recommendations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type RecommendedProduct = {
  id: string;
  handle: string;
  title: string;
  image: string;
  imageAlt: string;
  price: string;
  currencyCode: string;
};

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ products: [] });
  }

  const products = await getPersonalizedRecommendations(userId);
  const payload: RecommendedProduct[] = products.map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    image: product.featuredImage.url,
    imageAlt: product.featuredImage.altText || product.title,
    price: product.priceRange.minVariantPrice.amount,
    currencyCode: product.priceRange.minVariantPrice.currencyCode,
  }));

  return NextResponse.json({ products: payload });
}
