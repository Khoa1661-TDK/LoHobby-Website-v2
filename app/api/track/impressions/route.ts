// app/api/track/impressions/route.ts — batched product-card impressions.
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

  const items = Array.isArray(raw.items) ? raw.items : [];
  const ids = items
    .map((it) => boundedString((it as { productId?: unknown })?.productId, 128))
    .filter((id): id is string => Boolean(id))
    .slice(0, 200); // cap batch size
  if (ids.length === 0) return noContent();

  const day = utcDay();
  try {
    await prisma.$transaction(
      ids.map((productId) =>
        prisma.productCtrDaily.upsert({
          where: { productId_day: { productId, day } },
          create: { productId, day, impressions: 1, clicks: 0 },
          update: { impressions: { increment: 1 } },
        }),
      ),
    );
  } catch {
    // Swallow — dropped analytics write.
  }

  return noContent();
}