// lib/analytics/track-client.ts — client-only first-party analytics helpers.
// Pseudonymous ids + consent-gated beacons.
//
// `classifySource` lives in the peer module classify-source.ts (a pure,
// dependency-free module) and is re-exported here for convenience.
import { hasAnalyticsConsent } from '@/components/cookie-consent';

export {
  classifySource,
  type Attribution,
  type ClassifyInput,
} from '@/lib/analytics/classify-source';

const ANON_KEY = 'anon_id';
const SESSION_KEY = 'sess_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable pseudonymous visitor id, persisted across visits in localStorage. */
export function getAnonId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** Per-visit session id. `isNew` is true the first time it is created this tab session. */
export function getSession(): { id: string; isNew: boolean } {
  if (typeof window === 'undefined') return { id: '', isNew: false };
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return { id: existing, isNew: false };
    const id = randomId();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return { id, isNew: true };
  } catch {
    return { id: randomId(), isNew: true };
  }
}

/**
 * Fire a consent-gated beacon. No-ops entirely without analytics consent.
 * Uses sendBeacon (survives page unload), falling back to keepalive fetch.
 */
export function beacon(path: string, payload: unknown): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(path, blob)) return;
    }
    void fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort telemetry — never throw into the UI.
  }
}
