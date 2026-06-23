// app/api/build/preview-block/parse.ts — pure validator for the preview-block POST body.
import { routing } from '@/i18n/routing';
import type { PageBlock } from '@/lib/page-builder';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Validate the request body for POST /api/build/preview-block. Returns the parsed
 *  { locale, block } only when locale is a known locale and block is an object with a
 *  string blockType; otherwise null. Kept pure (no I/O) so it is unit-testable. */
export function parsePreviewBlockBody(
  data: unknown,
): { locale: string; block: PageBlock } | null {
  if (!isRecord(data)) return null;
  const { locale, block } = data;
  if (typeof locale !== 'string') return null;
  if (!(routing.locales as readonly string[]).includes(locale)) return null;
  if (!isRecord(block) || typeof block.blockType !== 'string') return null;
  return { locale, block: block as PageBlock };
}
