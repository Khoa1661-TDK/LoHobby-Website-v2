// app/api/track/click/route.ts — one product-card click-through.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noContent = (): NextResponse => new NextResponse(null, { status: 204 });

function utcDay(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!requestHasConsent(req)) return noContent();

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const productId = boundedString(raw.productId, 128);
  if (!productId) return noContent();

  const day = utcDay();
  try {
    await prisma.productCtrDaily.upsert({
      where: { productId_day: { productId, day } },
      create: { productId, day, impressions: 0, clicks: 1 },
      update: { clicks: { increment: 1 } },
    });
  } catch {
    // Swallow.
  }

  return noContent();
}