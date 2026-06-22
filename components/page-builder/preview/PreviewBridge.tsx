// components/page-builder/preview/PreviewBridge.tsx — invisible bridge that lives
// inside the preview iframe: announces readiness and refreshes on parent request.
'use client';
import { useEffect, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { ready, isParentToPreview } from '@/lib/page-builder/preview-messages';

export default function PreviewBridge(): ReactElement {
  const router = useRouter();

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!isParentToPreview(msg)) return;
      if (msg.type === 'refresh') router.refresh();
      if (msg.type === 'setTheme') {
        document.documentElement.classList.toggle('dark', msg.mode === 'dark');
      }
    }
    window.addEventListener('message', onMessage);
    window.parent.postMessage(ready(), window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  return <></>;
}
