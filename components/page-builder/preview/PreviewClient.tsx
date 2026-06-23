// components/page-builder/preview/PreviewClient.tsx — client root inside the preview
// iframe. Replaces the server PreviewCanvas + PreviewBridge. Seeds block state from the
// initial server render, announces readiness to the parent, and re-renders blocks from
// the layout state the editor pushes over postMessage (setLayout) — presentational
// blocks repaint instantly; data blocks delegate to DataBlockSlot (server re-render).
'use client';
import { useEffect, useState, type ReactElement } from 'react';
import type { PageBlock } from '@/lib/page-builder';
import { ready, isParentToPreview } from '@/lib/page-builder/preview-messages';
import PreviewBlockFrame from './PreviewBlockFrame';
import DataBlockSlot from './DataBlockSlot';
import { DATA_BLOCK_TYPES, renderClientBlock } from './clientBlockMap';

type Props = {
  initialBlocks: PageBlock[];
  initialBlockHtml: Record<number, string>;
  locale: string;
};

export default function PreviewClient({
  initialBlocks,
  initialBlockHtml,
  locale,
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
          {DATA_BLOCK_TYPES.has(block.blockType) ? (
            <DataBlockSlot
              block={block}
              index={index}
              locale={locale}
              initialHtml={initialBlockHtml[index] ?? ''}
            />
          ) : (
            renderClientBlock(block)
          )}
        </PreviewBlockFrame>
      ))}
    </>
  );
}
