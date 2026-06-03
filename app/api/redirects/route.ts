// app/api/redirects/route.ts — internal endpoint exposing the cached redirect
// map to the Edge middleware (which cannot run Payload directly).
//
// Trade-off: redirect rules are admin-managed config, but they are also
// inherently observable (hitting an old path reveals where it forwards). We
// therefore serve the enabled map without auth so middleware can read it
// pre-authentication. See DECISIONS.md. The handler is cheap: getValidRedirects()
// is unstable_cache-backed and tag-revalidated, so this is not a DB hit per call.
import { NextResponse } from 'next/server';

import { getValidRedirects } from '@/lib/redirects';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const redirects = await getValidRedirects();
  return NextResponse.json(
    { redirects },
    {
      headers: {
        // Hint shared caches; the middleware fetch also tag-revalidates on edit.
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
