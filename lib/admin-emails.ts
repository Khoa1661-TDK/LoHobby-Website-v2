// lib/admin-emails.ts — edge-safe admin allowlist (no NextAuth/Prisma imports)

const FALLBACK_ADMIN_EMAILS: readonly string[] = ['your-email@gmail.com'];

function parseAdminEmails(): readonly string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return FALLBACK_ADMIN_EMAILS;

  const parsed = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return parsed.length > 0 ? parsed : FALLBACK_ADMIN_EMAILS;
}

export const ADMIN_EMAILS: readonly string[] = parseAdminEmails();

export function isAdminEmail(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
