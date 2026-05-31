// scripts/cleanup-payload-categories.ts — remove non-canonical Payload categories
import { config as loadEnv } from 'dotenv';

loadEnv();

type CategoryDoc = {
  id: string | number;
  slug?: string | null;
  title?: string | null;
};

async function main(): Promise<void> {
  const { CATEGORY_SLUG_ALIASES, DEFAULT_CATEGORY_SLUGS } = await import('@/lib/default-categories');
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  const canonicalBySlug = new Map<string, CategoryDoc>();
  for (const slug of DEFAULT_CATEGORY_SLUGS) {
    const result = await payload.find({
      collection: 'categories',
      where: { slug: { equals: slug } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
      depth: 0,
    });
    const doc = result.docs[0] as CategoryDoc | undefined;
    if (doc) canonicalBySlug.set(slug, doc);
  }

  const allCategories = await payload.find({
    collection: 'categories',
    limit: 200,
    pagination: false,
    overrideAccess: true,
    depth: 0,
  });

  for (const raw of allCategories.docs) {
    const category = raw as CategoryDoc;
    const slug = typeof category.slug === 'string' ? category.slug.trim() : '';
    if (!slug || DEFAULT_CATEGORY_SLUGS.has(slug)) continue;

    const replacementSlug = CATEGORY_SLUG_ALIASES[slug];
    const replacement = replacementSlug ? canonicalBySlug.get(replacementSlug) : undefined;

    const linked = await payload.find({
      collection: 'products',
      where: { category: { equals: category.id } },
      limit: 200,
      pagination: false,
      overrideAccess: true,
      depth: 0,
    });

    for (const product of linked.docs) {
      const current = Array.isArray(product.category) ? product.category : [];
      const nextIds = current
        .map((entry) => {
          if (typeof entry === 'object' && entry !== null && 'id' in entry) {
            return (entry as { id: number }).id;
          }
          return typeof entry === 'number' ? entry : null;
        })
        .filter((id): id is number => typeof id === 'number' && id !== category.id);

      if (replacement && typeof replacement.id === 'number' && !nextIds.includes(replacement.id)) {
        nextIds.push(replacement.id);
      }

      await payload.update({
        collection: 'products',
        id: product.id,
        overrideAccess: true,
        data: { category: nextIds },
      });
      console.log(
        `[payload] reassigned product ${String(product.id)} from ${slug}${replacement ? ` → ${replacementSlug}` : ''}`,
      );
    }

    await payload.delete({
      collection: 'categories',
      id: category.id,
      overrideAccess: true,
    });
    console.log(`[payload] deleted extra category: ${slug}`);
  }

  console.log('[payload] category cleanup complete.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] failed to clean up categories: ${message}`);
  process.exit(1);
});
