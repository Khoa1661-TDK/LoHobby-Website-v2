// components/page-builder/preview/PreviewCanvas.tsx — server component that renders
// every draft block (incl. async/data blocks) wrapped in a selectable client frame.
import type { ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import type { PageBlock } from '@/lib/page-builder';
import PreviewBlockFrame from './PreviewBlockFrame';

type Props = { blocks: PageBlock[] };

export default function PreviewCanvas({ blocks }: Props): ReactElement {
  if (!blocks || blocks.length === 0) {
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
          {/* RenderBlocks accepts a single-block array; async blocks render on the server here */}
          <RenderBlocks blocks={[block]} />
        </PreviewBlockFrame>
      ))}
    </>
  );
}
