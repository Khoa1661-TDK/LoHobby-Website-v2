// components/blocks/PreviewRefresh.tsx — refreshes the route when Payload posts a save event.
'use client';

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';

export default function PreviewRefresh(): ReactElement {
  const router = useRouter();
  const serverURL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />;
}
