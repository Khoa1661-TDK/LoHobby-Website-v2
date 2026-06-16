// lib/page-builder/home-seed.ts — starting layout for a freshly created `home` page,
// mirroring the existing hardcoded homepage sections so conversion isn't a blank slate.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import type { PageBlock } from '@/lib/page-builder';

export function buildHomeSeedLayout(): PageBlock[] {
  const hero = createDefaultBlock('hero');
  const featured = createDefaultBlock('featuredProducts');
  const recommendations = createDefaultBlock('recommendations');

  const blocks: PageBlock[] = [];
  if (hero) {
    blocks.push({ ...hero, headline: 'Welcome', subheadline: 'Discover our latest products' } as unknown as PageBlock);
  }
  if (featured) blocks.push(featured);
  if (recommendations) blocks.push(recommendations);
  return blocks;
}