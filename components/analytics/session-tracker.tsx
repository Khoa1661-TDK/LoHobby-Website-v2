'use client';

import { useEffect } from 'react';
import { CONSENT_EVENT, hasAnalyticsConsent } from '@/components/cookie-consent';
import {
  beacon,
  classifySource,
  getAnonId,
  getSession,
  type Attribution,
} from '@/lib/analytics/track-client';

const SENT_KEY = 'sess_sent';
const ATTR_KEY = 'sess_attr';

/**
 * Records one first-party visit per browser session. First-touch attribution is
 * captured on the landing render and stashed, so it survives even if the visitor
 * grants analytics consent later. The actual beacon is consent-gated.
 */
export default function SessionTracker(): null {
  useEffect(() => {
    // Capture first-touch attribution immediately (before any client navigation
    // mutates the URL or referrer), regardless of consent.
    let attr: Attribution;
    try {
      const stored = window.sessionStorage.getItem(ATTR_KEY);
      if (stored) {
        attr = JSON.parse(stored) as Attribution;
      } else {
        attr = classifySource({
          search: window.location.search,
          referrer: document.referrer,
          currentHost: window.location.hostname,
        });
        window.sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
      }
    } catch {
      attr = { source: 'direct', medium: 'direct', campaign: null };
    }

    const landingPath = window.location.pathname;

    const attempt = (): void => {
      try {
        if (window.sessionStorage.getItem(SENT_KEY)) return;
        if (!hasAnalyticsConsent()) return; // wait until consent is granted
        const session = getSession();
        beacon('/api/track/session', {
          anonId: getAnonId(),
          sessionId: session.id,
          source: attr.source,
          medium: attr.medium,
          campaign: attr.campaign,
          referrer: document.referrer || null,
          landingPath,
        });
        window.sessionStorage.setItem(SENT_KEY, '1');
      } catch {
        // best-effort
      }
    };

    attempt();
    const onConsent = (): void => attempt();
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
