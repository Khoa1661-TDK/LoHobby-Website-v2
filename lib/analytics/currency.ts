// lib/analytics/currency.ts — VND formatting for admin analytics

const vndFormatter = new Intl.NumberFormat('vi-VN');

/** Whole-VND amounts (store orders use integer dong). */
export function formatVnd(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${vndFormatter.format(safe)} VND`;
}

/** Compact axis labels for charts (still vi-VN grouping, no currency suffix). */
export function formatVndAxis(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  if (safe >= 1_000_000) {
    return `${vndFormatter.format(Math.round(safe / 1_000_000))}tr`;
  }
  if (safe >= 1_000) {
    return `${vndFormatter.format(Math.round(safe / 1_000))}k`;
  }
  return vndFormatter.format(safe);
}
