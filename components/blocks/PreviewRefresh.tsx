// components/blocks/PreviewRefresh.tsx — refreshes the route when Payload posts a save event.
'use client';

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

export default function PreviewRefresh(): ReactElement {
  const router = useRouter();
  // Derive the origin from the browser at runtime rather than a build-time
  // `NEXT_PUBLIC_*` literal: live preview always runs same-origin with the
  // admin, so `window.location.origin` is correct on any deployment domain and
  // needs no rebuild. Falls back to localhost during SSR (no window).
  const serverURL =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />;
}
