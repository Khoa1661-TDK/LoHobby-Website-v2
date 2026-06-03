// app/api/track/session/route.ts — record one first-party visit (first-touch attribution).
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Always 204 (even on bad/no-consent input) — telemetry must never surface errors
// to the client or hint at validation internals.
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
  const source = boundedString(raw.source, 64);
  const medium = boundedString(raw.medium, 32);
  if (!anonId || !sessionId || !source || !medium) return noContent();

  const campaign = boundedString(raw.campaign, 128);
  const referrer = boundedString(raw.referrer, 512);
  const landingPath = boundedString(raw.landingPath, 512);

  // customerId is derived from the authenticated session — never from the body.
  const session = await auth();
  const customerId = session?.user?.id ?? null;

  try {
    await prisma.visitSession.upsert({
      where: { sessionId },
      // First-touch: on create, persist the acquisition channel. On a repeat
      // beacon for the same session, only refresh lastSeenAt / late-bound customer.
      create: { anonId, sessionId, source, medium, campaign, referrer, landingPath, customerId },
      update: { lastSeenAt: new Date(), ...(customerId ? { customerId } : {}) },
    });
  } catch {
    // Swallow — a dropped analytics write is not worth a 500.
  }

  return noContent();
}
