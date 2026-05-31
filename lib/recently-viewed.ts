// lib/recently-viewed.ts — client-only localStorage helpers for recently viewed products
export type RecentProduct = {
  handle: string;
  title: string;
  image: string;
  price: string;
  currencyCode: string;
};

const KEY = 'recently-viewed';
const MAX = 12;

export function readRecentlyViewed(): RecentProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentProduct[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(product: RecentProduct): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readRecentlyViewed().filter((item) => item.handle !== product.handle);
    const next = [product, ...existing].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors (private mode, quota).
  }
}
