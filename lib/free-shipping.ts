// lib/free-shipping.ts — free-shipping threshold math for the cart.
//
// A threshold of 0 means the feature is DISABLED (that is the default in
// lib/shipping-settings.ts), not that everything ships free. Callers get null
// in that case and must render nothing.

export type FreeShippingProgress = {
  qualified: boolean;
  /** Amount still needed to qualify, in VND. Always 0 once qualified. */
  remainingVnd: number;
  /** Progress toward the threshold, 0–100, rounded to an integer. */
  percent: number;
};

export function resolveFreeShippingProgress(
  subtotalVnd: number,
  thresholdVnd: number,
): FreeShippingProgress | null {
  if (!Number.isFinite(thresholdVnd) || thresholdVnd <= 0) return null;

  const subtotal = Number.isFinite(subtotalVnd) && subtotalVnd > 0 ? subtotalVnd : 0;

  if (subtotal >= thresholdVnd) {
    return { qualified: true, remainingVnd: 0, percent: 100 };
  }

  return {
    qualified: false,
    remainingVnd: thresholdVnd - subtotal,
    percent: Math.round((subtotal / thresholdVnd) * 100),
  };
}
