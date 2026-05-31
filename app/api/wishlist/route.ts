import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWishlistProductIds } from '@/lib/wishlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ productIds: [] });
  }
  const productIds = await getWishlistProductIds(session.user.id);
  return NextResponse.json({ productIds });
}
