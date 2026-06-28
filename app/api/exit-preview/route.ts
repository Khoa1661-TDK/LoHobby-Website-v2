// app/api/exit-preview/route.ts — disables Next draft mode.
import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveBaseUrl } from '@/lib/utils';

export async function GET(req: NextRequest): Promise<Response> {
  const draft = await draftMode();
  draft.disable();

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const target = path && path.startsWith('/') && !path.startsWith('//') ? path : '/';

  // Runtime base (`APP_URL`), not `req.url` — see app/api/preview/route.ts.
  return NextResponse.redirect(new URL(target, resolveBaseUrl()));
}
