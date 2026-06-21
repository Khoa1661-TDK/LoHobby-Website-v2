// lib/page-builder/admin-guard.ts — verify a Payload admin session for builder routes.
import type { BasePayload } from 'payload';
import { isPayloadAdminUser } from '@/lib/payload-access';

type AuthLike = Pick<BasePayload, 'auth'>;

/** Pure, testable core: given a payload-auth-capable object, request headers, and an
 * allowlist predicate, resolve whether the caller is an authorized admin. */
export async function isAuthorizedAdmin(
  payload: AuthLike,
  headers: Headers,
  isAllowed: (user: unknown) => boolean = isPayloadAdminUser as (u: unknown) => boolean,
): Promise<boolean> {
  try {
    const { user } = await payload.auth({ headers });
    if (!user) return false;
    return isAllowed(user);
  } catch {
    return false;
  }
}