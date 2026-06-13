// lib/analytics/cart-metrics.ts — PURE cart-abandonment + add-to-cart funnel math.

export type CartAbandonment = {
  abandoned: number;
  completed: number;
  /** abandoned / (abandoned + completed), 0–100, one decimal. */
  abandonmentPct: number;
};

export type AtcFunnel = {
  atcSessions: number;
  convertedSessions: number;
  /** convertedSessions / atcSessions, 0–100, one decimal. */
  conversionPct: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Carts with items only. `completed` carts checked out; the rest are abandoned. */
export function computeCartAbandonment(
  carts: { completed: boolean; itemCount: number }[],
): CartAbandonment {
  const withItems = carts.filter((c) => c.itemCount > 0);
  const completed = withItems.filter((c) => c.completed).length;
  const abandoned = withItems.length - completed;
  const denom = abandoned + completed;
  return {
    abandoned,
    completed,
    abandonmentPct: denom > 0 ? round1((abandoned / denom) * 100) : 0,
  };
}

/** Of the distinct sessions that added to cart, how many belong to a converted customer. */
export function computeAtcFunnel(
  sessions: { sessionId: string; customerId: string | null }[],
  convertedCustomerIds: Set<string>,
): AtcFunnel {
  const atcSessions = sessions.length;
  const convertedSessions = sessions.filter(
    (s) => s.customerId && convertedCustomerIds.has(s.customerId),
  ).length;
  return {
    atcSessions,
    convertedSessions,
    conversionPct: atcSessions > 0 ? round1((convertedSessions / atcSessions) * 100) : 0,
  };
}