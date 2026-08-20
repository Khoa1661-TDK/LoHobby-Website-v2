// Smoke probe: call every Payload-backed console reader against the real DB.
// dotenv first, then DYNAMIC imports — payload's loadEnv explodes if it is
// pulled in before the env is present (same pattern as scripts/seed-payload-*).
import { config as loadEnv } from 'dotenv';
loadEnv();

function show(name: string, v: unknown) {
  const s = JSON.stringify(v);
  console.log(`     ${name}: ${s && s.length > 200 ? s.slice(0, 200) + '…' : s}`);
}

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    const out = await fn();
    const n = Array.isArray(out) ? out.length : 1;
    console.log(`OK   ${name}  (${n})`);
    show('first', Array.isArray(out) ? out[0] : out);
  } catch (e) {
    console.log(`FAIL ${name}: ${(e as Error).message}`);
  }
}

async function main() {
  const orders = await import('@/lib/console/orders');
  const products = await import('@/lib/console/products');
  const categories = await import('@/lib/console/categories');
  const media = await import('@/lib/console/media');
  const customers = await import('@/lib/console/customers');
  const content = await import('@/lib/console/content');
  const settings = await import('@/lib/console/settings');

  await step('countOrders', () => orders.countOrders());
  await step('listOrderRows', () => orders.listOrderRows(3));
  await step('countProducts', async () => ({ total: await products.countProducts() }));
  await step('listProductRows', () => products.listProductRows(3));
  await step('listCategoryRows', () => categories.listCategoryRows());
  await step('listMediaItems', () => media.listMediaItems(3));
  await step('listCustomerRows', () => customers.listCustomerRows(3));
  await step('listPageRows', () => content.listPageRows(3));
  await step('listRedirectRows', () => content.listRedirectRows(3));
  await step('getBrandFacts', () => settings.getBrandFacts());
  process.exit(0);
}
main();
