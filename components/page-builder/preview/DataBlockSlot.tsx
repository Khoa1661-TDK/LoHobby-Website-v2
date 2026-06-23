// components/page-builder/preview/DataBlockSlot.tsx — client slot for one async data
// block inside the preview iframe. Data blocks can't render from layout state alone, so
// this injects server-rendered HTML: it starts from the SSR-seeded initialHtml and, on
// later config changes, debounces ~250ms then POSTs the block to /api/build/preview-block
// and swaps in the returned HTML. The previous HTML stays visible while fetching.
'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';

type Props = {
  block: PageBlock;
  index: number;
  locale: string;
  initialHtml: string;
};

const DEBOUNCE_MS = 250;

export default function DataBlockSlot({ block, index, locale, initialHtml }: Props): ReactElement {
  const [html, setHtml] = useState<string>(initialHtml);
  // Serialize the block so the effect only re-runs on actual config changes.
  const serialized = JSON.stringify(block);
  const isFirst = useRef(true);
  // Monotonic request id so a slow earlier response can't overwrite a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    // First mount uses the SSR-seeded HTML — no fetch, no flash.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void fetch('/api/build/preview-block', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale, block: JSON.parse(serialized) }),
      })
        .then((res) => (res.ok ? res.text() : null))
        .then((text) => {
          // Ignore stale responses if a newer request has since started.
          if (text !== null && id === requestId.current) setHtml(text);
        })
        .catch(() => {
          // Keep the previous HTML on failure; preview is best-effort.
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [serialized, locale]);

  return <div data-pb-datablock={index} dangerouslySetInnerHTML={{ __html: html }} />;
}
