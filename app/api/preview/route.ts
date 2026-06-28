// app/api/preview/route.ts — enables Next draft mode for the page builder live preview.
import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { isValidPreviewToken } from '@/lib/preview';
import { resolveBaseUrl } from '@/lib/utils';

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const path = searchParams.get('path') ?? '/';

  if (!isValidPreviewToken(secret)) {
    return new NextResponse('Invalid preview token', { status: 401 });
  }

  // Only allow same-origin relative redirects.
  if (!path.startsWith('/') || path.startsWith('//')) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  // Build the redirect from the runtime base (`APP_URL`), not `req.url`: in a
  // route handler `req.url` reports the internal `localhost:3000`, which would
  // bounce the preview to localhost on any non-local host.
  return NextResponse.redirect(new URL(path, resolveBaseUrl()));
}
