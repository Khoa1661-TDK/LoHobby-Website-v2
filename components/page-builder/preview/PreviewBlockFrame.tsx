// components/page-builder/preview/PreviewBlockFrame.tsx — selectable wrapper
// around one server-rendered block inside the preview iframe.
'use client';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { select, isParentToPreview } from '@/lib/page-builder/preview-messages';

type Props = { index: number; children: ReactNode };

export default function PreviewBlockFrame({ index, children }: Props): ReactElement {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!isParentToPreview(msg) || msg.type !== 'highlight') return;
      setSelected(msg.index === index);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [index]);

  return (
    <div
      data-pb-index={index}
      onClick={(e) => {
        e.stopPropagation();
        window.parent.postMessage(select(index), window.location.origin);
      }}
      className={
        'relative cursor-pointer outline-offset-[-2px] transition-[outline] ' +
        (selected ? 'outline outline-2 outline-blue-500' : 'hover:outline hover:outline-1 hover:outline-blue-300')
      }
    >
      {children}
    </div>
  );
}
