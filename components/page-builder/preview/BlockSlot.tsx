// components/page-builder/preview/BlockSlot.tsx — renders ONE page-builder block inside
// the preview iframe. The storefront block components are server components with
// server-only transitive imports (next/cache, payload, prisma), so they cannot be
// rendered in the iframe's client bundle. Instead each block paints from a server-
// rendered seed node (initialNode, from the preview page's RSC render) and, when its
// config changes, debounces then fetches the single-block render route and swaps in the
// extracted markup. The previous content stays visible while fetching. Injected markup is
// non-interactive — acceptable for a layout preview.
'use client';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { PageBlock } from '@/lib/page-builder';

type Props = {
  block: PageBlock;
  index: number;
  locale: string;
  slug: string;
  // Server-rendered seed for the block's first paint. Undefined for blocks added after
  // initial load (those fetch on mount).
  initialNode?: ReactNode;
};

const DEBOUNCE_MS = 200;

/** Pull just the block markup out of a fetched preview-block page document, discarding
 *  the surrounding <html>/<body>/page chrome. Returns null if the marker is absent. */
export function extractBlockHtml(documentText: string): string | null {
  const doc = new DOMParser().parseFromString(documentText, 'text/html');
  return doc.getElementById('pb-block-root')?.innerHTML ?? null;
}

export default function BlockSlot({
  block,
  index,
  locale,
  slug,
  initialNode,
}: Props): ReactElement {
  // null = show the seed node (or loading); a string = injected fetched markup.
  const [html, setHtml] = useState<string | null>(null);
  // Serialize the block so the effect only re-runs on actual config changes.
  const serialized = JSON.stringify(block);
  const hasSeed = initialNode !== undefined && initialNode !== null;
  const isFirst = useRef(true);
  // Monotonic request id so a slow earlier response can't overwrite a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      // A block present at initial load already shows its correct server-rendered seed —
      // no fetch needed. A newly added block has no seed and must fetch on mount.
      if (hasSeed) return;
    }

    const id = ++requestId.current;
    const timer = setTimeout(() => {
      const url = `/${locale}/build/${slug}/preview/block?block=${encodeURIComponent(serialized)}`;
      void fetch(url)
        .then((res) => (res.ok ? res.text() : null))
        .then((text) => {
          // Ignore stale responses if a newer request has since started.
          if (text === null || id !== requestId.current) return;
          const extracted = extractBlockHtml(text);
          if (extracted !== null) setHtml(extracted);
        })
        .catch(() => {
          // Keep the previous content on failure; preview is best-effort.
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [serialized, locale, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-pb-block={index}>
      {html !== null ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : hasSeed ? (
        initialNode
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-warm-400">
          Loading…
        </div>
      )}
    </div>
  );
}
