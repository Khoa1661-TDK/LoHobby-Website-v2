// components/page-builder/preview/PreviewClient.tsx — client root inside the preview
// iframe. Replaces the server PreviewCanvas + PreviewBridge. Seeds block state from the
// initial server render, announces readiness to the parent, and re-renders from the
// layout state the editor pushes over postMessage (setLayout). Every block is rendered
// through BlockSlot, which paints a server-rendered seed and re-fetches a single-block
// server render when that block changes — the storefront block components can't run in
// the client bundle (server-only transitive imports), so the iframe never imports them.
'use client';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import { ready, isParentToPreview } from '@/lib/page-builder/preview-messages';
import PreviewBlockFrame from './PreviewBlockFrame';
import BlockSlot from './BlockSlot';

type Props = {
  initialBlocks: PageBlock[];
  // Server-rendered RSC nodes for each block's first paint, keyed by layout index.
  initialNodes: Record<number, ReactNode>;
  locale: string;
  slug: string;
};

export default function PreviewClient({
  initialBlocks,
  initialNodes,
  locale,
  slug,
}: Props): ReactElement {
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!isParentToPreview(msg)) return;
      if (msg.type === 'setLayout') setBlocks(msg.blocks);
      if (msg.type === 'setTheme') {
        document.documentElement.classList.toggle('dark', msg.mode === 'dark');
      }
      // highlight is handled by PreviewBlockFrame; refresh no longer exists.
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage(ready(), window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (blocks.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-warm-400">
        This page has no sections yet. Add one from the layers panel.
      </div>
    );
  }

  return (
    <>
      {blocks.map((block, index) => (
        <PreviewBlockFrame key={index} index={index}>
          <BlockSlot
            block={block}
            index={index}
            locale={locale}
            slug={slug}
            initialNode={initialNodes[index]}
          />
        </PreviewBlockFrame>
      ))}
    </>
  );
}
