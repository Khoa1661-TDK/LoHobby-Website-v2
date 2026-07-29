// Regression test for the plugin-ordering invariant behind Task 6
// (`autoSaleJobsPlugin` in ../plugins.ts).
//
// @shopnex/import-export-plugin only registers its own `createCollectionExport`
// job task when `config.jobs` is still unset at the point it runs
// (`config.jobs = config.jobs || { tasks: [...] }`). `autoSaleJobsPlugin` must
// therefore run AFTER it in `shopnexPlugins` and merge onto `config.jobs.tasks`
// rather than overwrite it — this exact bug shipped once already (a discarded
// migration that dropped `createCollectionExport` from the DB enum) before it
// was caught. Deliberately does not import `payload.config.ts`: that module
// throws without `DATABASE_URL`/`PAYLOAD_SECRET` set, which would make this
// test environment-dependent. Instead it folds `shopnexPlugins` directly over
// a minimal fake config, the same way `payload.buildConfig` does internally.
import { describe, it, expect } from 'vitest';
import { shopnexPlugins } from '@/src/payload/plugins';

/**
 * Minimal config shape the plugin chain needs to run without crashing.
 * `importExportPlugin` looks up `products`/`orders` by slug (per the
 * `importCollections` option in plugins.ts) and mutates them in place;
 * `seoPlugin` spreads `collection.fields` for every collection slug it's
 * configured against (`products` here), so `fields: []` is required or the
 * spread throws on `undefined`.
 */
function buildFakeConfig() {
  return {
    collections: [
      { slug: 'products', fields: [] },
      { slug: 'orders', fields: [] },
    ],
    globals: [],
    admin: {},
  } as any;
}

async function foldPlugins() {
  let config = buildFakeConfig();
  for (const plugin of shopnexPlugins) {
    config = await plugin(config);
  }
  return config;
}

describe('job task registration', () => {
  it('should register autoSale without dropping the import-export plugin task', async () => {
    const config = await foldPlugins();
    const slugs = (config.jobs?.tasks ?? []).map((t: { slug: string }) => t.slug);
    expect(slugs).toEqual(expect.arrayContaining(['createCollectionExport', 'autoSale']));
  });

  it('should drain the same queue the autoSale task schedules onto', async () => {
    const config = await foldPlugins();
    const autoSale = config.jobs.tasks.find((t: { slug: string }) => t.slug === 'autoSale');
    const scheduledQueues = autoSale.schedule.map((s: { queue: string }) => s.queue);
    const drainedQueues = config.jobs.autoRun.map((r: { queue: string }) => r.queue);
    // Guard against a vacuous pass: if either array were ever emptied, the
    // loop below would never run and this test would report green despite
    // the schedule/autoRun wiring being broken — exactly the regression it
    // exists to catch.
    expect(scheduledQueues.length).toBeGreaterThan(0);
    expect(drainedQueues.length).toBeGreaterThan(0);
    for (const q of scheduledQueues) {
      expect(drainedQueues).toContain(q);
    }
  });
});
