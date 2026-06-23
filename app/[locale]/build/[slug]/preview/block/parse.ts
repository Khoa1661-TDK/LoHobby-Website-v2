// app/[locale]/build/[slug]/preview/block/parse.ts — pure validator for the single-block
// preview render route. The block config is passed as a JSON `block` query param so the
// preview can re-render an UNSAVED data-block edit without a DB round-trip. Kept pure
// (no I/O) so it is unit-testable.
import type { PageBlock } from '@/lib/page-builder';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse the `?block=<json>` query param into a PageBlock. Returns null when the param
 *  is missing, not valid JSON, or not an object with a string `blockType`. */
export function parsePreviewBlockParam(raw: string | undefined): PageBlock | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || typeof data.blockType !== 'string') return null;
  return data as PageBlock;
}
