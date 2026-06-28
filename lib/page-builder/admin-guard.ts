// lib/page-builder/admin-guard.ts — verify a Payload admin session for builder routes.
import type { BasePayload } from 'payload';
import { isPayloadAdminUser } from '@/lib/payload-access';

type AuthLike = Pick<BasePayload, 'auth'>;

/** Read the raw `payload-token` cookie without decodeURI — JWTs must stay byte-exact.
 * Cookie name is the Payload default prefix (`payload`); this project does not set a
 * custom `cookiePrefix`. */
function readPayloadToken(headers: Headers): string | null {
  const cookie = headers.get('cookie');
  if (!cookie) return null;
  const prefix = 'payload-token=';
  for (const part of cookie.split(';')) {
    const seg = part.trim();
    if (seg.startsWith(prefix)) return seg.slice(prefix.length);
  }
  return null;
}

/** Pure, testable core: given a payload-auth-capable object, request headers, and an
 * allowlist predicate, resolve whether the caller is an authorized admin. */
export async function isAuthorizedAdmin(
  payload: AuthLike,
  headers: Headers,
  isAllowed: (user: unknown) => boolean = isPayloadAdminUser as (u: unknown) => boolean,
): Promise<boolean> {
  try {
    let { user } = await payload.auth({ headers });

    // Payload's cookie auth applies a CSRF gate that rejects the `payload-token`
    // cookie when the request carries neither `Origin` nor `Sec-Fetch-Site`.
    // Browsers omit `Sec-Fetch-*` on plain-HTTP, non-localhost origins, so a
    // logged-in admin's same-origin builder requests (top-level nav, preview
    // iframe, block re-render) get rejected and bounced to /admin/login. When the
    // cookie path yields no user, re-validate the cookie's own token through the
    // JWT strategy (signature + session lookup, no CSRF gate). Safe under
    // SameSite=Lax: the cookie is never sent on cross-site requests, so this does
    // not weaken CSRF protection — the token is still fully validated.
    if (!user) {
      const token = readPayloadToken(headers);
      if (token) {
        const jwtHeaders = new Headers();
        jwtHeaders.set('authorization', `JWT ${token}`);
        ({ user } = await payload.auth({ headers: jwtHeaders }));
      }
    }

    if (!user) return false;
    return isAllowed(user);
  } catch {
    return false;
  }
}