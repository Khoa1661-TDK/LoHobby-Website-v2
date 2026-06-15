// app/api/track/cart/route.ts — record one add-to-cart action.
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noContent = (): NextResponse => new NextResponse(null, { status: 204 });

export async function POST(req: Request): Promise<NextResponse> {
  if (!requestHasConsent(req)) return noContent();

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const anonId = boundedString(raw.anonId, 64);
  const sessionId = boundedString(raw.sessionId, 64);
  const productId = boundedString(raw.productId, 128);
  if (!anonId || !sessionId || !productId) return noContent();

  const productHandle = boundedString(raw.productHandle, 256) ?? '';
  const qtyRaw = typeof raw.quantity === 'number' ? raw.quantity : Number(raw.quantity);
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.min(Math.round(qtyRaw), 999) : 1;

  // customerId is derived from the authenticated session — never from the body.
  const session = await auth();
  const customerId = session?.user?.id ?? null;

  try {
    await prisma.addToCartEvent.create({
      data: { anonId, sessionId, customerId, productId, productHandle, quantity },
    });
  } catch {
    // Swallow — dropped analytics write, not a client-facing failure.
  }

  return noContent();
}