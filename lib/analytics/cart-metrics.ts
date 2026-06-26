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

/**
 * A distinct add-to-cart session. `anonId` is the stable pseudonymous visitor id
 * (covers guests and survives across visits); `customerId` is the logged-in user
 * id when known. Either one can match a purchase, so guest carts are counted too.
 */
export type AtcSession = {
  sessionId: string;
  anonId: string | null;
  customerId: string | null;
};

/** Conversion signals collected from checkout (PurchaseEvent rows). */
export type Conversions = {
  anonIds: Set<string>;
  customerIds: Set<string>;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * A cart converted if the visitor checked out under the same pseudonymous id
 * (`anonId`, covers guests) OR — for logged-in shoppers buying on another device
 * — under the same customer id. This is what lets us count guest conversions.
 */
function isConverted(session: AtcSession, conversions: Conversions): boolean {
  return (
    (session.anonId !== null && conversions.anonIds.has(session.anonId)) ||
    (session.customerId !== null && conversions.customerIds.has(session.customerId))
  );
}

/**
 * Cart abandonment across ALL add-to-cart sessions (guests included). A session
 * is `completed` when it can be matched to a checkout, otherwise `abandoned`.
 */
export function computeCartAbandonment(
  sessions: AtcSession[],
  conversions: Conversions,
): CartAbandonment {
  const completed = sessions.filter((s) => isConverted(s, conversions)).length;
  const abandoned = sessions.length - completed;
  const denom = abandoned + completed;
  return {
    abandoned,
    completed,
    abandonmentPct: denom > 0 ? round1((abandoned / denom) * 100) : 0,
  };
}

/** Of the distinct sessions that added to cart, how many converted to a purchase. */
export function computeAtcFunnel(
  sessions: AtcSession[],
  conversions: Conversions,
): AtcFunnel {
  const atcSessions = sessions.length;
  const convertedSessions = sessions.filter((s) => isConverted(s, conversions)).length;
  return {
    atcSessions,
    convertedSessions,
    conversionPct: atcSessions > 0 ? round1((convertedSessions / atcSessions) * 100) : 0,
  };
}
