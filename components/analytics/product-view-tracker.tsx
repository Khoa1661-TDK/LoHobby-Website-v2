'use client';

import { useEffect } from 'react';
import { beacon, getAnonId, getSession } from '@/lib/analytics/track-client';

type Props = {
  productId: string;
  productHandle: string;
};

// Glances shorter than this aren't meaningful dwell; drop them client-side.
const MIN_DWELL_MS = 1000;

/**
 * Measures how long a product page is actually looked at (tab visible) and
 * beacons the dwell on hide/unmount. Time spent with the tab backgrounded is
 * not counted. Renders nothing.
 */
export default function ProductViewTracker({ productId, productHandle }: Props): null {
  useEffect(() => {
    let visibleMs = 0;
    let lastStart: number | null =
      document.visibilityState === 'visible' ? Date.now() : null;
    let sent = false;

    const accumulate = (): void => {
      if (lastStart !== null) {
        visibleMs += Date.now() - lastStart;
        lastStart = null;
      }
    };

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        lastStart = Date.now();
      } else {
        accumulate();
      }
    };

    const flush = (): void => {
      if (sent) return;
      accumulate();
      if (visibleMs < MIN_DWELL_MS) return;
      sent = true;
      beacon('/api/track/view', {
        anonId: getAnonId(),
        sessionId: getSession().id,
        productId,
        productHandle,
        dwellMs: Math.round(visibleMs),
      });
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush(); // client-side navigation away from the product page
    };
  }, [productId, productHandle]);

  return null;
}
