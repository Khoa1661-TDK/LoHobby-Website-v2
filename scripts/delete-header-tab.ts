// scripts/delete-header-tab.ts — remove a custom navigation tab from the `site-header`
// global by label (case-insensitive). Idempotent maintenance tool.
//
//   pnpm tsx scripts/delete-header-tab.ts "flash sale"
//
// Defaults to "flash sale" when no argument is given. Only touches the custom `tabs`
// array — built-in defaults (Home / Shop / Categories) live in code and are unaffected.
import { config as loadEnv } from 'dotenv';

loadEnv();

type RawTab = { label?: string | null } & Record<string, unknown>;

async function main(): Promise<void> {
  const target = (process.argv[2] ?? 'flash sale').trim().toLowerCase();
  if (!target) {
    console.error('[delete-header-tab] empty target label; aborting.');
    process.exit(1);
  }

  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  const current = await payload.findGlobal({ slug: 'site-header', depth: 0 });
  const tabs: RawTab[] = Array.isArray((current as { tabs?: RawTab[] }).tabs)
    ? ((current as { tabs?: RawTab[] }).tabs as RawTab[])
    : [];

  console.log(
    `[delete-header-tab] current tabs: ${
      tabs.map((t) => t?.label ?? '(unlabeled)').join(', ') || '(none)'
    }`,
  );

  const remaining = tabs.filter(
    (t) => (typeof t?.label === 'string' ? t.label.trim().toLowerCase() : '') !== target,
  );

  if (remaining.length === tabs.length) {
    console.log(`[delete-header-tab] no tab matching "${target}"; nothing to do.`);
    return;
  }

  await payload.updateGlobal({
    slug: 'site-header',
    data: { tabs: remaining } as never,
    depth: 0,
  });

  console.log(
    `[delete-header-tab] removed ${tabs.length - remaining.length} tab(s) matching "${target}".`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[delete-header-tab] failed: ${message}`);
    process.exit(1);
  });
