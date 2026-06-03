// app/api/track/view/route.ts — record a product-detail view with dwell time.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent, sanitizeDwell } from '@/lib/analytics/track-server';

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
  const dwellMs = sanitizeDwell(raw.dwellMs);

  try {
    await prisma.productViewEvent.create({
      data: { anonId, sessionId, productId, productHandle, dwellMs },
    });
  } catch {
    // Swallow — dropped analytics write, not a client-facing failure.
  }

  return noContent();
}
