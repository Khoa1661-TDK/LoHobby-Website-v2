// lib/analytics/carts-data.ts — DATA layer for cart abandonment + ATC funnel.
import config from '@payload-config';
import { getPayload } from 'payload';
import { prisma } from '@/lib/prisma';
import { fetchOrdersInRange, isRevenueOrder } from '@/lib/analytics/dashboard';
import {
  computeCartAbandonment,
  computeAtcFunnel,
  type CartAbandonment,
  type AtcFunnel,
} from '@/lib/analytics/cart-metrics';

async function fetchConvertedCustomerIds(start: Date, end: Date): Promise<Set<string>> {
  const orders = await fetchOrdersInRange(start, end);
  const paidEmails = new Set(
    orders
      .filter(isRevenueOrder)
      .map((o) => o.buyerEmail?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );
  if (paidEmails.size === 0) return new Set();
  const users = await prisma.user.findMany({
    where: { email: { in: [...paidEmails] } },
    select: { id: true },
  });
  return new Set(users.map((u) => u.id));
}

export async function getCartAbandonment(
  start: Date,
  end: Date,
): Promise<{ abandonment: CartAbandonment; funnel: AtcFunnel }> {
  const payload = await getPayload({ config });

  const [cartsResult, atcEvents, convertedCustomerIds] = await Promise.all([
    payload.find({
      collection: 'carts',
      where: { updatedAt: { greater_than: start.toISOString(), less_than: end.toISOString() } },
      pagination: false,
      limit: 5000,
      select: { completed: true, cartItems: true },
    }),
    prisma.addToCartEvent.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { sessionId: true, customerId: true },
    }),
    fetchConvertedCustomerIds(start, end),
  ]);

  const carts = cartsResult.docs.map((c) => ({
    completed: (c as { completed?: boolean }).completed === true,
    itemCount: ((c as { cartItems?: unknown[] }).cartItems ?? []).length,
  }));

  // Distinct ATC sessions, keeping the first non-null customerId seen.
  const sessionMap = new Map<string, string | null>();
  for (const e of atcEvents) {
    const existing = sessionMap.get(e.sessionId);
    if (existing === undefined || (existing === null && e.customerId)) {
      sessionMap.set(e.sessionId, e.customerId ?? null);
    }
  }
  const sessions = [...sessionMap.entries()].map(([sessionId, customerId]) => ({
    sessionId,
    customerId,
  }));

  return {
    abandonment: computeCartAbandonment(carts),
    funnel: computeAtcFunnel(sessions, convertedCustomerIds),
  };
}