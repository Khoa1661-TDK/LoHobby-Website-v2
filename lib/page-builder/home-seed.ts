// lib/page-builder/home-seed.ts — starting layout for a freshly created `home` page,
// mirroring the existing hardcoded homepage sections so conversion isn't a blank slate.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import type { PageBlock } from '@/lib/page-builder';

export function buildHomeSeedLayout(): PageBlock[] {
  const hero = createDefaultBlock('hero');
  const recommendations = createDefaultBlock('recommendations');

  // NOTE: featuredProducts is intentionally omitted. Its `products` relationship is
  // `required` with `minRows: 1`, so a default-instantiated block (empty products)
  // fails Payload validation and the whole page create is rejected. The seed produces
  // a valid, non-blank starting layout; the admin adds a Featured Products section with
  // real products from the visual builder.
  const blocks: PageBlock[] = [];
  if (hero) {
    blocks.push({ ...hero, headline: 'Welcome', subheadline: 'Discover our latest products' } as unknown as PageBlock);
  }
  if (recommendations) blocks.push(recommendations);
  return blocks;
}