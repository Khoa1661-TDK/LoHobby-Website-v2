// app/api/admin-connect/route.ts — establish Payload CMS session (Route Handler can set cookies)
import config from '@payload-config';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { getAdminUser } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { resolveBaseUrl } from '@/lib/utils';
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
  // Build redirect targets from the runtime canonical base (`APP_URL`), NOT
  // `req.url`: in a Next.js route handler `req.url` reports the internal origin
  // (`http://localhost:3000`), so absolute redirects would jump to localhost
  // regardless of the host the admin actually visited. `resolveBaseUrl()` reads
  // `APP_URL` first, so one prebuilt image follows whatever domain is set at
  // runtime (LAN IP, real domain) with no rebuild.
  const baseUrl = resolveBaseUrl();

  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/admin', baseUrl));
  }

  const returnPath = safeReturnPath(req.nextUrl.searchParams.get('return'));
  const cookieHeader = req.headers.get('cookie') ?? '';
  const payload = await getPayload({ config });
  const cookiePrefix = payload.config.cookiePrefix ?? 'payload';
  const tokenCookieName = getPayloadTokenCookieNameForConfig(cookiePrefix);
  const hadStaleToken = readCookieRaw(cookieHeader, tokenCookieName) !== null;
  const ssoRetried = readCookieRaw(cookieHeader, 'payload-sso-retry') === '1';

  if (hadStaleToken && ssoRetried) {
    return NextResponse.redirect(new URL('/login?error=stale-session', baseUrl));
  }

  try {
    const sessionCookie = await createPayloadAdminSessionCookie(admin);
    const response = NextResponse.redirect(new URL(returnPath, baseUrl));

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
    // Log the real error server-side for debugging, but never surface raw
    // Payload AuthenticationError text to the user — the message "The email
    // or password provided is incorrect" misleads the admin into thinking
    // their storefront credentials are wrong when the real failure is an
    // internal SSO issue (stale password hash, secret rotation, etc.).
    logger.error({ err: error }, '[api/admin-connect] SSO failed');
    return NextResponse.redirect(
      new URL('/login?error=stale-session', baseUrl),
    );
  }
}
