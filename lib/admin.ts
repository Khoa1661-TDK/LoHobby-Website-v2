// lib/admin.ts
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';

export { ADMIN_EMAILS, isAdminEmail } from '@/lib/admin-emails';

export type AdminSessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export async function getAdminUser(): Promise<AdminSessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.email || !isAdminEmail(user.email)) return null;

  // Admin recognition requires the Google OAuth provider, not just an
  // allowlisted email. A credentials-provider session (email/password) must
  // never be treated as admin, even if it holds an allowlisted email — this
  // closes the race where an attacker registers the admin's email via
  // /api/register before the real admin has ever signed in with Google.
  if (user.provider !== 'google') return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
  };
}

/**
 * Hard guard intended for Server Actions. Throws if the caller is not an
 * authenticated admin. The throw is deliberate — actions should never silently
 * mutate the database when authorization fails.
 */
export async function requireAdmin(): Promise<AdminSessionUser> {
  const admin = await getAdminUser();
  if (!admin) {
    throw new Error('Forbidden: admin privileges required');
  }
  return admin;
}
