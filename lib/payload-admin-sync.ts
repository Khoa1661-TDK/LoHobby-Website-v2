// lib/payload-admin-sync.ts — sync NextAuth admins into Payload CMS accounts
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import config from '@payload-config';
import { generatePayloadCookie, getPayload } from 'payload';
import type { AdminSessionUser } from '@/lib/admin';
import { isAdminEmail } from '@/lib/admin-emails';
import { logger } from '@/lib/logger';

export type PayloadSessionCookie = {
  name: string;
  value: string;
  options: {
    domain?: string;
    expires?: Date;
    maxAge?: number;
    httpOnly: boolean;
    path: string;
    sameSite: 'lax' | 'strict' | 'none';
    secure: boolean;
  };
};

function getSsoSecret(): string {
  const secret = process.env.PAYLOAD_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('PAYLOAD_SECRET (or AUTH_SECRET fallback) must be set');
  }
  return secret;
}

function isLocalHttpDev(): boolean {
  // `APP_URL` (runtime) first: this decides whether the admin SSO cookie gets the
  // `Secure` flag. A baked `NEXT_PUBLIC_*` value would freeze this to the build
  // host — marking the cookie non-secure on a real HTTPS deploy and breaking
  // admin login. Reading the runtime var keeps it correct per-deployment.
  const serverUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  return serverUrl.startsWith('http://');
}

function normalizeSameSite(value: unknown): 'lax' | 'strict' | 'none' {
  if (typeof value !== 'string') return 'lax';
  const lower = value.toLowerCase();
  if (lower === 'strict' || lower === 'none') return lower;
  return 'lax';
}

/**
 * Server-only password so Payload login can run without a second user-facing
 * sign-in.
 *
 * ⚠️  SECRET-ROTATION HAZARD: this password is deterministic on
 * (PAYLOAD_SECRET ?? AUTH_SECRET, email). If either secret is rotated, every
 * existing Payload `users` row will have a stale password hash. The
 * `forcePasswordReset` recovery in `createPayloadAdminSessionCookie()` self-
 * heals this on the NEXT admin visit, but ONLY if it actually runs (i.e. the
 * first login fails). Never rotate the secret without also re-seeding admin
 * passwords, or be prepared for a one-time login failure per admin.
 */
export function derivePayloadPassword(email: string): string {
  return createHmac('sha256', getSsoSecret())
    .update(email.trim().toLowerCase())
    .digest('hex');
}

function getPayloadTokenCookieName(cookiePrefix: string): string {
  return `${cookiePrefix}-token`;
}

/** Read a cookie value without decodeURI — JWTs must stay byte-exact. */
function readCookieRaw(cookieHeader: string, name: string): string | null {
  for (const segment of cookieHeader.split(';')) {
    const trimmed = segment.trim();
    const prefix = `${name}=`;
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}

export async function ensurePayloadAdminUser(
  admin: Pick<AdminSessionUser, 'email' | 'name'>,
  options: { forcePasswordReset?: boolean } = {},
): Promise<void> {
  if (!isAdminEmail(admin.email)) {
    throw new Error('Only administrator emails can have CMS accounts');
  }

  const payload = await getPayload({ config });
  const email = admin.email.trim().toLowerCase();
  const password = derivePayloadPassword(email);

  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  });

  if (existing.docs.length === 0) {
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email,
        name: admin.name ?? email,
        password,
      },
    });
    return;
  }

  // The derived password is deterministic (HMAC of email + PAYLOAD_SECRET) so
  // there is no reason to re-hash and rewrite it on every admin session — that
  // turns a fast cookie set into a DB write per visit AND races with any
  // concurrent admin-connect. Only write when:
  //   - the display name changed, OR
  //   - the caller explicitly asked for a recovery reset
  const existingDoc = existing.docs[0]!;
  const nextName = admin.name ?? email;
  const needsNameSync = existingDoc.name !== nextName;
  const needsPasswordSync = options.forcePasswordReset === true;

  if (needsPasswordSync || needsNameSync) {
    const updateData: Record<string, unknown> = {};

    if (needsNameSync) {
      updateData.name = nextName;
    }

    if (needsPasswordSync) {
      updateData.password = password;
      // Clear any login lockout that may have been triggered by earlier
      // failed SSO attempts (e.g. after a secret rotation). Payload auth
      // tracks `loginAttempts` and `lockUntil`; resetting them prevents the
      // recovery retry from being silently blocked.
      updateData.loginAttempts = 0;
      updateData.lockUntil = null;
    }

    await payload.update({
      collection: 'users',
      id: existingDoc.id,
      overrideAccess: true,
      data: updateData,
    });
  }
}

/**
 * Creates a Payload login session and returns cookie data for a Route Handler
 * to attach via `response.cookies.set(...)`.
 *
 * On first login failure (thrown exception OR null token), force-resets the
 * Payload user's password to the deterministic derived value, clears any login
 * lockout counters, and retries ONCE. This self-heals after secret rotations
 * or account lockouts without requiring manual DB intervention.
 */
export async function createPayloadAdminSessionCookie(
  admin: Pick<AdminSessionUser, 'email' | 'name'>,
): Promise<PayloadSessionCookie> {
  const payload = await getPayload({ config });
  const cookiePrefix = payload.config.cookiePrefix ?? 'payload';

  await ensurePayloadAdminUser(admin);

  const email = admin.email.trim().toLowerCase();
  const password = derivePayloadPassword(email);

  // ---------- first login attempt ----------
  let token: string | undefined | null;

  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    });
    token = result.token;
  } catch {
    // Payload throws AuthenticationError on credential mismatch. The stored
    // password hash may be stale (secret rotation, manual reset, etc.).
    token = null;
  }

  // ---------- recovery path ----------
  if (!token) {
    // Force-reset the Payload user's password to the deterministic derived
    // value and clear any login lockout, then retry once.
    await ensurePayloadAdminUser(admin, { forcePasswordReset: true });

    try {
      const retry = await payload.login({
        collection: 'users',
        data: { email, password },
      });
      token = retry.token;
    } catch {
      token = null;
    }
  }

  if (!token) {
    // Deliberately do NOT surface Payload's raw AuthenticationError text
    // ("The email or password provided is incorrect") — the user's storefront
    // credentials are valid; the failure is internal SSO.
    throw new Error(`Failed to establish CMS session for ${email}`);
  }

  const authConfig = payload.collections.users?.config.auth;
  if (!authConfig) {
    throw new Error('Payload users auth is not configured');
  }

  const payloadCookie = generatePayloadCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix,
    returnCookieAsObject: true,
    token,
  });

  if (!payloadCookie.value) {
    throw new Error('Failed to build CMS session cookie');
  }

  const secure =
    !isLocalHttpDev() &&
    Boolean(
      payloadCookie.secure ??
        authConfig.cookies.secure ??
        payload.config.serverURL?.startsWith('https'),
    );

  return {
    name: payloadCookie.name,
    value: payloadCookie.value,
    options: {
      domain: authConfig.cookies.domain ?? undefined,
      expires: payloadCookie.expires ? new Date(payloadCookie.expires) : undefined,
      maxAge: 60 * 60 * 24 * 14,
      httpOnly: payloadCookie.httpOnly ?? true,
      path: payloadCookie.path ?? '/',
      sameSite: normalizeSameSite(payloadCookie.sameSite ?? authConfig.cookies.sameSite),
      secure,
    },
  };
}

/** True when Payload accepts the current request as an authenticated admin. */
export async function hasValidPayloadAdminSession(): Promise<boolean> {
  const user = await getPayloadAdminUser();
  return user !== null;
}

/** Returns the Payload user for this request, or null when unauthenticated. */
export async function getPayloadAdminUser(): Promise<{ id: string | number; email?: string | null } | null> {
  const headerStore = await headers();
  const payload = await getPayload({ config });
  let { user } = await payload.auth({ headers: headerStore });

  // SSR top-level navigations to /admin can arrive without `Origin` or
  // `Sec-Fetch-Site` headers (notably when /admin is reached via a server
  // redirect, as our SSO bridge does). Payload's cookie auth applies a CSRF gate
  // that rejects the session cookie when both are absent, which would bounce the
  // admin into an endless SSO retry (`stale-session`). For this READ-ONLY
  // identity check we re-validate the cookie's own token through the JWT strategy
  // (signature + session lookup, no CSRF gate). This is safe: it only decides
  // what to render — state-changing admin requests still originate from the
  // Payload admin client, which sends an allowlisted `Origin` and stays
  // CSRF-protected.
  if (!user) {
    const cookieHeader = headerStore.get('cookie') ?? '';
    const cookiePrefix = payload.config.cookiePrefix ?? 'payload';
    const token = readCookieRaw(cookieHeader, getPayloadTokenCookieName(cookiePrefix));
    if (token) {
      const jwtHeaders = new Headers();
      jwtHeaders.set('authorization', `JWT ${token}`);
      ({ user } = await payload.auth({ headers: jwtHeaders }));
    }
  }

  if (!user || typeof user !== 'object' || !('id' in user)) {
    return null;
  }

  const email = 'email' in user && typeof user.email === 'string' ? user.email : null;
  if (!isAdminEmail(email)) {
    return null;
  }

  return { id: user.id as string | number, email };
}

export function getPayloadTokenCookieNameForConfig(cookiePrefix = 'payload'): string {
  return getPayloadTokenCookieName(cookiePrefix);
}

export { readCookieRaw };

/** Bootstrap CMS accounts for every email in ADMIN_EMAILS. */
export async function seedPayloadAdminUsers(): Promise<void> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  const emails = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  if (emails.length === 0) {
    throw new Error('ADMIN_EMAILS must list at least one administrator email');
  }

  for (const email of emails) {
    await ensurePayloadAdminUser({ email, name: email });
    logger.info({ email }, '[payload] synced CMS admin');
  }
}
