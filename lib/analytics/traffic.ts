// lib/analytics/traffic.ts — visit attribution: sessions and conversion per source.
//
// Conversion is attributed by joining VisitSession.customerId → User.email →
// paid Order.buyerEmail. This covers logged-in buyers only; guest checkouts (no
// customerId on the session, or an email with no matching user) are counted as
// sessions but not as conversions. Stamping the source onto the order at
// checkout would close that gap — deferred.
import { prisma } from '@/lib/prisma';
import { fetchOrdersInRange, isRevenueOrder } from '@/lib/analytics/dashboard';

export type SourceTraffic = {
  source: string;
  sessions: number;
  /** Share of all sessions in the range, 0–100, one decimal. */
  sharePct: number;
  conversions: number;
  /** conversions / sessions for this source, 0–100, one decimal. */
  conversionPct: number;
};

export type SessionLite = { source: string; customerId: string | null };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function fetchVisitSessionsInRange(start: Date, end: Date): Promise<SessionLite[]> {
  return prisma.visitSession.findMany({
    where: { firstSeenAt: { gte: start, lte: end } },
    select: { source: true, customerId: true },
  });
}

/**
 * Pure aggregation: group sessions by source, counting a session as converted
 * when its customerId is in `convertedCustomerIds`. Sorted by session count desc.
 */
export function groupTrafficBySource(
  sessions: SessionLite[],
  convertedCustomerIds: Set<string>,
): SourceTraffic[] {
  const total = sessions.length;
  const map = new Map<string, { sessions: number; conversions: number }>();

  for (const session of sessions) {
    const key = session.source || 'direct';
    const entry = map.get(key) ?? { sessions: 0, conversions: 0 };
    entry.sessions += 1;
    if (session.customerId && convertedCustomerIds.has(session.customerId)) {
      entry.conversions += 1;
    }
    map.set(key, entry);
  }

  return [...map.entries()]
    .map(([source, entry]) => ({
      source,
      sessions: entry.sessions,
      sharePct: total > 0 ? round1((entry.sessions / total) * 100) : 0,
      conversions: entry.conversions,
      conversionPct: entry.sessions > 0 ? round1((entry.conversions / entry.sessions) * 100) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

/** Resolve the set of customer ids who placed a paid order in the range (by email). */
async function fetchConvertedCustomerIds(start: Date, end: Date): Promise<Set<string>> {
  const orders = await fetchOrdersInRange(start, end);
  const paidEmails = new Set(
    orders
      .filter(isRevenueOrder)
      .map((order) => order.buyerEmail?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email)),
  );
  if (paidEmails.size === 0) return new Set();

  const users = await prisma.user.findMany({
    where: { email: { in: [...paidEmails] } },
    select: { id: true },
  });
  return new Set(users.map((user) => user.id));
}

/** Traffic-by-source table for the admin dashboard over [start, end]. */
export async function getTrafficBySource(start: Date, end: Date): Promise<SourceTraffic[]> {
  const [sessions, convertedCustomerIds] = await Promise.all([
    fetchVisitSessionsInRange(start, end),
    fetchConvertedCustomerIds(start, end),
  ]);
  return groupTrafficBySource(sessions, convertedCustomerIds);
}
