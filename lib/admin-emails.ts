// lib/admin-emails.ts — edge-safe admin allowlist (no NextAuth/Prisma imports)

// No hardcoded fallback: an unset or empty ADMIN_EMAILS must fail closed to
// zero admins, never to a public, self-registerable admin account.
function parseAdminEmails(): readonly string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [];

  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

export const ADMIN_EMAILS: readonly string[] = parseAdminEmails();

export function isAdminEmail(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
