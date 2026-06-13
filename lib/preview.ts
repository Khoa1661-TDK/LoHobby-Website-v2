// lib/preview.ts — draft-mode preview token validation (admin-only).

/** True only when PREVIEW_SECRET is set and the supplied token matches it exactly. */
export function isValidPreviewToken(token: string | null | undefined): boolean {
  const expected = process.env.PREVIEW_SECRET;
  if (!expected) return false;
  return typeof token === 'string' && token.length > 0 && token === expected;
}
