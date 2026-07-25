import type { PageBlock } from '@/lib/page-builder';

export type LayoutSnapshotItem = {
  index: number;
  blockType: string;
  summary: Record<string, string>;
};

const MAX_FIELD_LEN = 80;

/** Fields the model must never see or target. */
const HIDDEN = new Set(['blockType', 'id', 'blockKey']);

/** Render one field value as a short string the model can reason about. Arrays collapse to
 * a row COUNT — critically including "0 rows", which is how the model notices a block it
 * added but never filled. References collapse to their bound id or "unset". Returns null
 * for values worth omitting entirely. */
function summarize(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return 'unset';
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === 'string') {
    return value.length > MAX_FIELD_LEN ? value.slice(0, MAX_FIELD_LEN) : value;
  }
  if (typeof value === 'number') return `#${value}`;
  if (typeof value === 'boolean') return String(value);
  // Objects are either a populated relationship/upload doc or Lexical richText state.
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'number' || typeof id === 'string') return `#${id}`;
    return 'set';
  }
  return null;
}

/** Reduce a layout to index + blockType + a compact per-field summary. Long strings are
 * truncated; use read_block for full values. */
export function serializeLayout(layout: PageBlock[]): LayoutSnapshotItem[] {
  return layout.map((block, index) => {
    const record = block as Record<string, unknown>;
    const summary: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (HIDDEN.has(key)) continue;
      const rendered = summarize(value);
      if (rendered !== null) summary[key] = rendered;
    }
    return { index, blockType: block.blockType, summary };
  });
}
