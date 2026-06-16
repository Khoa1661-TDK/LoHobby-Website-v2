'use client';

import { useEffect, useRef, type ReactElement } from 'react';
import { beacon, getAnonId, getSession } from '@/lib/analytics/track-client';
import { hasAnalyticsConsent } from '@/components/cookie-consent';

type Props = { productId: string; productHandle: string };

// Module-level queue: batch impressions across all cards on the page, flush once.
const queue = new Set<string>();
let flushBound = false;

function flush(): void {
  if (queue.size === 0) return;
  const items = [...queue].map((productId) => ({ productId }));
  queue.clear();
  beacon('/api/track/impressions', {
    anonId: getAnonId(),
    sessionId: getSession().id,
    items,
  });
}

function ensureFlushBound(): void {
  if (flushBound || typeof window === 'undefined') return;
  flushBound = true;
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

const VISIBLE_RATIO = 0.5;
const DWELL_MS = 1000;

export default function ProductCardTracker({ productId, productHandle }: Props): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!hasAnalyticsConsent()) return;
    ensureFlushBound();
    const card = ref.current?.closest('a');
    if (!card) return;

    let counted = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
            if (!counted && timer === null) {
              timer = setTimeout(() => {
                if (!counted) {
                  counted = true;
                  queue.add(productId);
                }
              }, DWELL_MS);
            }
          } else if (timer !== null) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [VISIBLE_RATIO] },
    );
    io.observe(card);

    const onClick = (): void => {
      beacon('/api/track/click', {
        anonId: getAnonId(),
        sessionId: getSession().id,
        productId,
        productHandle,
      });
    };
    card.addEventListener('click', onClick);

    return () => {
      io.disconnect();
      card.removeEventListener('click', onClick);
      if (timer !== null) clearTimeout(timer);
    };
  }, [productId, productHandle]);

  return <span ref={ref} aria-hidden style={{ display: 'none' }} />;
}