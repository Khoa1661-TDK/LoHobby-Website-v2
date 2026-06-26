// lib/analytics/carts-data.ts — DATA layer for cart abandonment + ATC funnel.
//
// Both metrics are sourced from real cart signals, all in Prisma:
//   • `AddToCartEvent` — one row per add-to-cart action (the cart universe).
//   • `PurchaseEvent`  — one row per completed checkout, stamped with the
//     visitor's `anonId` (and `customerId` when logged in) so conversions can be
//     attributed to BOTH guests and logged-in shoppers.
//
// A cart converts when its session shares an `anonId` OR `customerId` with a
// checkout in range. The Payload `carts` collection is NOT used: the storefront
// persists live carts to a cookie + Prisma `PersistedCart`, never to that
// collection, so it stays empty and would always read as zero.
import { prisma } from '@/lib/prisma';
import {
  computeCartAbandonment,
  computeAtcFunnel,
  type AtcSession,
  type Conversions,
  type CartAbandonment,
  type AtcFunnel,
} from '@/lib/analytics/cart-metrics';

async function fetchConversions(start: Date, end: Date): Promise<Conversions> {
  const purchases = await prisma.purchaseEvent.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { anonId: true, customerId: true },
  });
  const anonIds = new Set<string>();
  const customerIds = new Set<string>();
  for (const p of purchases) {
    if (p.anonId) anonIds.add(p.anonId);
    if (p.customerId) customerIds.add(p.customerId);
  }
  return { anonIds, customerIds };
}

export async function getCartAbandonment(
  start: Date,
  end: Date,
): Promise<{ abandonment: CartAbandonment; funnel: AtcFunnel }> {
  const [atcEvents, conversions] = await Promise.all([
    prisma.addToCartEvent.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { sessionId: true, anonId: true, customerId: true },
    }),
    fetchConversions(start, end),
  ]);

  // Distinct ATC sessions, keeping the first non-null anonId / customerId seen.
  const sessionMap = new Map<string, AtcSession>();
  for (const e of atcEvents) {
    const existing = sessionMap.get(e.sessionId);
    if (!existing) {
      sessionMap.set(e.sessionId, {
        sessionId: e.sessionId,
        anonId: e.anonId ?? null,
        customerId: e.customerId ?? null,
      });
    } else {
      if (existing.anonId === null && e.anonId) existing.anonId = e.anonId;
      if (existing.customerId === null && e.customerId) existing.customerId = e.customerId;
    }
  }
  const sessions = [...sessionMap.values()];

  return {
    abandonment: computeCartAbandonment(sessions, conversions),
    funnel: computeAtcFunnel(sessions, conversions),
  };
}
