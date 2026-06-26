import type { PageBlock } from '@/lib/page-builder';

export type LayoutSnapshotItem = {
  index: number;
  blockType: string;
  summary: Record<string, string>;
};

const MAX_FIELD_LEN = 80;

/** Reduce a layout to index + blockType + short string fields. Arrays, objects,
 * and the blockType/id/blockKey keys are dropped; long strings are truncated. */
export function serializeLayout(layout: PageBlock[]): LayoutSnapshotItem[] {
  return layout.map((block, index) => {
    const record = block as Record<string, unknown>;
    const summary: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === 'blockType' || key === 'id' || key === 'blockKey') continue;
      if (typeof value === 'string' && value.length > 0) {
        summary[key] = value.length > MAX_FIELD_LEN ? value.slice(0, MAX_FIELD_LEN) : value;
      }
    }
    return { index, blockType: block.blockType, summary };
  });
}
