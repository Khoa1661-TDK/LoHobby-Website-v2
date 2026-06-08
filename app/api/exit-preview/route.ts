// app/api/exit-preview/route.ts — disables Next draft mode.
import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  const draft = await draftMode();
  draft.disable();

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const target = path && path.startsWith('/') && !path.startsWith('//') ? path : '/';

  return NextResponse.redirect(new URL(target, req.url));
}
