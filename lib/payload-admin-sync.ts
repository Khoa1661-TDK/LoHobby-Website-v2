// lib/payload-admin-sync.ts — sync NextAuth admins into Payload CMS accounts
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import config from '@payload-config';
import { generatePayloadCookie, getPayload } from 'payload';
import type { AdminSessionUser } from '@/lib/admin';
import { isAdminEmail } from '@/lib/admin-emails';

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
  const serverUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return serverUrl.startsWith('http://');
}

function normalizeSameSite(value: unknown): 'lax' | 'strict' | 'none' {
  if (typeof value !== 'string') return 'lax';
  const lower = value.toLowerCase();
  if (lower === 'strict' || lower === 'none') return lower;
  return 'lax';
}

/** Server-only password so Payload login can run without a second user-facing sign-in. */
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
    await payload.update({
      collection: 'users',
      id: existingDoc.id,
      overrideAccess: true,
      data: {
        ...(needsNameSync ? { name: nextName } : {}),
        ...(needsPasswordSync ? { password } : {}),
      },
    });
  }
}

/**
 * Creates a Payload login session and returns cookie data for a Route Handler
 * to attach via `response.cookies.set(...)`.
 */
export async function createPayloadAdminSessionCookie(
  admin: Pick<AdminSessionUser, 'email' | 'name'>,
): Promise<PayloadSessionCookie> {
  const payload = await getPayload({ config });
  const cookiePrefix = payload.config.cookiePrefix ?? 'payload';

  await ensurePayloadAdminUser(admin);

  const email = admin.email.trim().toLowerCase();
  const password = derivePayloadPassword(email);

  const result = await payload.login({
    collection: 'users',
    data: { email, password },
  });

  let token = result.token;

  if (!token) {
    // Recovery path: an older deployment may have stored a different password
    // hash for this email (or it was rotated). Force-reset to the deterministic
    // derived password and retry once.
    await ensurePayloadAdminUser(admin, { forcePasswordReset: true });

    const retry = await payload.login({
      collection: 'users',
      data: { email, password },
    });
    token = retry.token;
  }

  if (!token) {
    throw new Error('Failed to establish CMS session');
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
  const { user } = await payload.auth({ headers: headerStore });

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
    console.log(`[payload] synced CMS admin: ${email}`);
  }
}
