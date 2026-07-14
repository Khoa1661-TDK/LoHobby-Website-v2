// lib/preview.ts — draft-mode preview token validation (admin-only).
import { timingSafeEqual } from 'node:crypto';

/** True only when PREVIEW_SECRET is set and the supplied token matches it exactly. */
export function isValidPreviewToken(token: string | null | undefined): boolean {
  const expected = process.env.PREVIEW_SECRET;
  if (!expected) return false;
  if (typeof token !== 'string' || token.length === 0) return false;

  // Constant-time compare to avoid leaking PREVIEW_SECRET via a timing
  // side-channel. timingSafeEqual throws on length mismatch, so bail out on
  // that (in non-constant time, but length alone leaks far less than a
  // byte-by-byte match) before calling it.
  if (Buffer.byteLength(token) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
