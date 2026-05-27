// app/api/admin-connect/route.ts — establish Payload CMS session (Route Handler can set cookies)
import config from '@payload-config';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { getAdminUser } from '@/lib/admin';
import {
  createPayloadAdminSessionCookie,
  getPayloadTokenCookieNameForConfig,
  readCookieRaw,
  type PayloadSessionCookie,
} from '@/lib/payload-admin-sync';

function safeReturnPath(value: string | null): string {
  if (value?.startsWith('/admin') && !value.startsWith('//')) {
    return value;
  }
  return '/admin';
}

function applySessionCookie(response: NextResponse, sessionCookie: PayloadSessionCookie): void {
  response.cookies.set(sessionCookie.name, sessionCookie.value, {
    domain: sessionCookie.options.domain,
    expires: sessionCookie.options.expires,
    maxAge: sessionCookie.options.maxAge,
    httpOnly: sessionCookie.options.httpOnly,
    path: sessionCookie.options.path,
    sameSite: sessionCookie.options.sameSite,
    secure: sessionCookie.options.secure,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/admin', req.url));
  }

  const returnPath = safeReturnPath(req.nextUrl.searchParams.get('return'));
  const cookieHeader = req.headers.get('cookie') ?? '';
  const payload = await getPayload({ config });
  const cookiePrefix = payload.config.cookiePrefix ?? 'payload';
  const tokenCookieName = getPayloadTokenCookieNameForConfig(cookiePrefix);
  const hadStaleToken = readCookieRaw(cookieHeader, tokenCookieName) !== null;
  const ssoRetried = readCookieRaw(cookieHeader, 'payload-sso-retry') === '1';

  if (hadStaleToken && ssoRetried) {
    return NextResponse.redirect(new URL('/admin-connect?error=stale-session', req.url));
  }

  try {
    const sessionCookie = await createPayloadAdminSessionCookie(admin);
    const response = NextResponse.redirect(new URL(returnPath, req.url));

    response.cookies.delete(tokenCookieName);
    applySessionCookie(response, sessionCookie);

    if (hadStaleToken) {
      response.cookies.set('payload-sso-retry', '1', {
        httpOnly: true,
        path: '/',
        maxAge: 60,
        sameSite: 'lax',
      });
    } else {
      response.cookies.delete('payload-sso-retry');
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Đăng nhập CMS thất bại';
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=/admin&error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
