// scripts/backfill-en-translations.ts
// Backfill the English (`en`) content locale for existing store data by
// machine-translating the Vietnamese (`vi`) source values. The localized
// fields were added after the catalog was seeded, so every `en` value is
// currently empty and — because Payload's localization runs with
// `fallback: true` — reads back as the `vi` text on the storefront. This
// script fills them in once, reusing the SAME OpenRouter translator the
// page-builder mirror uses (lib/page-builder/mirror/translate.ts).
//
// Localized fields it fills (source `vi` -> target `en`):
//   products         title, description
//   categories       title, subtitle
//   product-variants name
//
// Idempotency: each doc's current `en` value is read with locale fallback
// DISABLED (`fallbackLocale: false`), so an unfilled `en` returns empty
// rather than the `vi` fallback. A field whose `en` is already non-empty is
// left untouched; a doc with nothing left to translate is skipped. Re-running
// is therefore safe and cheap (no LLM calls for already-translated docs).
//
// Usage (run directly via tsx — never `pnpm <script>`, which fails a deps
// precheck; the app env supplies @payload-config, DB access, and the
// OPENROUTER_API_KEY the translator needs):
//   node_modules/.bin/tsx scripts/backfill-en-translations.ts --dry-run
//   node_modules/.bin/tsx scripts/backfill-en-translations.ts --collection=products --limit=2
//   node_modules/.bin/tsx scripts/backfill-en-translations.ts            # full run
//
// Flags:
//   --dry-run                 report per-collection counts, make no LLM calls or writes
//   --limit=N                 process only the first N docs per collection
//   --collection=<slug>       restrict to one of products|categories|product-variants
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';

import { createTranslateClient, translateTextMap } from '@/lib/page-builder/mirror/translate';
import type { TextEntry } from '@/lib/page-builder/mirror/translatable';

loadEnv();

// Modest fan-out: each doc is one LLM round-trip plus one Payload update, so a
// small batch keeps the OpenRouter free tier and the pg pool comfortable.
const CONCURRENCY = 4;

const SOURCE_LOCALE = 'vi';
const TARGET_LOCALE = 'en';

// The localized text fields per collection, in the order they should be logged.
const FIELD_MAP = {
  products: ['title', 'description'],
  categories: ['title', 'subtitle'],
  'product-variants': ['name'],
} as const;

type CollectionSlug = keyof typeof FIELD_MAP;

const ALL_COLLECTIONS = Object.keys(FIELD_MAP) as CollectionSlug[];

type Doc = Record<string, unknown> & { id: number | string };

type Args = {
  dryRun: boolean;
  limit: number | null;
  collection: CollectionSlug | null;
};

function parseArgs(argv: string[]): Args {
  const dryRun = argv.includes('--dry-run');
  let limit: number | null = null;
  let collection: CollectionSlug | null = null;
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (Number.isFinite(n) && n > 0) limit = Math.floor(n);
    } else if (arg.startsWith('--collection=')) {
      const slug = arg.slice('--collection='.length);
      if ((ALL_COLLECTIONS as string[]).includes(slug)) {
        collection = slug as CollectionSlug;
      } else {
        throw new Error(
          `--collection must be one of ${ALL_COLLECTIONS.join('|')} (got "${slug}")`,
        );
      }
    }
  }
  return { dryRun, limit, collection };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function truncate(value: string, max = 80): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// Fetch every doc of a collection at the source locale, paginated.
async function fetchAllSourceDocs(
  payload: Payload,
  collection: CollectionSlug,
): Promise<Doc[]> {
  const docs: Doc[] = [];
  let page = 1;
  for (;;) {
    const res = await payload.find({
      collection,
      locale: SOURCE_LOCALE,
      limit: 200,
      page,
      depth: 0,
      overrideAccess: true,
      pagination: true,
    });
    for (const doc of res.docs as Doc[]) docs.push(doc);
    if (!res.hasNextPage) break;
    page += 1;
  }
  return docs;
}

type Plan = {
  id: number | string;
  // Fields whose `en` is empty but whose `vi` source is present — the ones
  // that actually need translating for this doc.
  entries: TextEntry[];
};

// Decide, for one source doc, which fields still need an `en` value. Reads the
// doc's current `en` with fallback disabled so an unfilled locale reports empty.
async function planDoc(
  payload: Payload,
  collection: CollectionSlug,
  doc: Doc,
  fields: readonly string[],
): Promise<Plan | null> {
  const sourceByField = new Map<string, string>();
  for (const field of fields) {
    const src = nonEmptyString(doc[field]);
    if (src) sourceByField.set(field, src);
  }
  if (sourceByField.size === 0) return null; // no source text at all

  const enDoc = (await payload.findByID({
    collection,
    id: doc.id,
    locale: TARGET_LOCALE,
    fallbackLocale: false,
    depth: 0,
    overrideAccess: true,
  })) as Doc;

  const entries: TextEntry[] = [];
  for (const [field, value] of sourceByField) {
    // Already translated if `en` is non-empty AND not merely equal to the vi
    // source (a stray equal value is treated as unfilled and retranslated).
    const enVal = nonEmptyString(enDoc[field]);
    if (enVal && enVal !== value) continue;
    entries.push({ path: field, value });
  }
  if (entries.length === 0) return null; // every field already has an en value
  return { id: doc.id, entries };
}

async function processCollection(
  payload: Payload,
  collection: CollectionSlug,
  args: Args,
  client: ReturnType<typeof createTranslateClient>,
): Promise<{ translated: number; skipped: number; failed: number }> {
  const fields = FIELD_MAP[collection];
  let docs = await fetchAllSourceDocs(payload, collection);
  const total = docs.length;
  if (args.limit != null) docs = docs.slice(0, args.limit);

  console.log(
    `\n[${collection}] ${total} docs at ${SOURCE_LOCALE}` +
      (args.limit != null ? ` (limited to first ${docs.length})` : ''),
  );

  // Plan phase (reads only): figure out which docs need work. Cheap enough to
  // run serially and gives an accurate dry-run count.
  const plans: Plan[] = [];
  let skipped = 0;
  for (const doc of docs) {
    const plan = await planDoc(payload, collection, doc, fields);
    if (plan) plans.push(plan);
    else skipped += 1;
  }

  console.log(
    `  ${plans.length} need translation, ${skipped} already-done/empty-source`,
  );

  if (args.dryRun) {
    return { translated: 0, skipped: plans.length + skipped, failed: 0 };
  }

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < plans.length; i += CONCURRENCY) {
    const batch = plans.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (plan) => {
        try {
          const map = await translateTextMap(
            plan.entries,
            SOURCE_LOCALE,
            TARGET_LOCALE,
            client,
          );
          const data: Record<string, string> = {};
          for (const entry of plan.entries) {
            const en = map[entry.path];
            if (typeof en === 'string' && en.trim()) data[entry.path] = en;
          }
          if (Object.keys(data).length === 0) {
            // Translator returned nothing usable; treat as a failure rather
            // than writing the vi source back into en.
            failed += 1;
            console.warn(`  ! ${collection} #${plan.id}: translator returned no usable text`);
            return;
          }
          await payload.update({
            collection,
            id: plan.id,
            locale: TARGET_LOCALE,
            overrideAccess: true,
            data,
          });
          translated += 1;
          for (const entry of plan.entries) {
            const en = data[entry.path];
            if (en) {
              console.log(
                `  [${collection} #${plan.id}] ${entry.path}: "${truncate(entry.value)}" -> "${truncate(en)}"`,
              );
            }
          }
        } catch (err) {
          failed += 1;
          console.warn(
            `  ! ${collection} #${plan.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }

  return { translated, skipped, failed };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const client = createTranslateClient();
  if (!args.dryRun && !client) {
    throw new Error(
      'OPENROUTER_API_KEY is not set — cannot translate. Set it, or use --dry-run.',
    );
  }

  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  const collections = args.collection ? [args.collection] : ALL_COLLECTIONS;

  const summary: Record<string, { translated: number; skipped: number; failed: number }> = {};
  for (const collection of collections) {
    summary[collection] = await processCollection(payload, collection, args, client);
  }

  let tTranslated = 0;
  let tSkipped = 0;
  let tFailed = 0;
  console.log(`\n[summary]${args.dryRun ? ' (dry-run)' : ''}`);
  for (const collection of collections) {
    const s = summary[collection]!;
    tTranslated += s.translated;
    tSkipped += s.skipped;
    tFailed += s.failed;
    console.log(
      `  ${collection}: translated ${s.translated}, skipped ${s.skipped}, failed ${s.failed}`,
    );
  }
  console.log(
    `  TOTAL: translated ${tTranslated}, skipped ${tSkipped}, failed ${tFailed}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[fatal]', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
