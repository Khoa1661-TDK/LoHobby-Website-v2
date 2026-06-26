// lib/analytics/track-server.ts — server-side helpers for the tracking routes.
import 'server-only';

// Mirrors CONSENT_COOKIE in components/cookie-consent.tsx (kept local to avoid
// importing a 'use client' module into a server route).
const CONSENT_COOKIE = 'cookie-consent';

/**
 * Default-on consent: record unless the visitor explicitly opted out. The client
 * beacon is already consent-aware; this is the server-side counterpart so direct
 * POSTs honour an opt-out too.
 */
export function requestHasConsent(req: Request): boolean {
  const cookie = req.headers.get('cookie');
  return !(cookie?.includes(`${CONSENT_COOKIE}=rejected`) ?? false);
}

/** Coerce to a trimmed, length-bounded string, or null when invalid/empty. */
export function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Cap dwell so backgrounded-tab / clock-skew garbage can't poison aggregates. */
export const MAX_DWELL_MS = 30 * 60 * 1000;

export function sanitizeDwell(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), MAX_DWELL_MS);
}
