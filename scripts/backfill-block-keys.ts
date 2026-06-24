// scripts/backfill-block-keys.ts — one-time: assign a blockKey to every layout block (all
// locales) that lacks one, so the mirror hook can track blocks across locales. Idempotent:
// blocks that already have a key are left alone. Passes skipMirror so the afterChange hook
// does not fire during the backfill.
import { getPayload } from 'payload';
import config from '@payload-config';
import { stripBlockIds } from '@/lib/page-builder/strip-block-ids';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

const LOCALES = ['vi', 'en'];
const newKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const schemas = getBlockSchemas();
  const { docs } = await payload.find({ collection: 'pages', limit: 0, depth: 0 });

  for (const page of docs) {
    for (const locale of LOCALES) {
      const doc = await payload.findByID({ collection: 'pages', id: page.id, locale, depth: 0 });
      const layout = Array.isArray(doc?.layout) ? (doc.layout as Record<string, unknown>[]) : [];
      let changed = false;
      const next = layout.map((b) => {
        if (typeof b.blockKey === 'string' && b.blockKey) return b;
        changed = true;
        return { ...b, blockKey: newKey() };
      });
      if (changed) {
        await payload.update({
          collection: 'pages',
          id: page.id,
          locale,
          data: { layout: stripBlockIds(next as never, schemas) },
          req: { skipMirror: true } as never,
        });
        console.log(`backfilled blockKeys: page "${page.slug}" (${locale})`);
      }
    }
  }
  console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
