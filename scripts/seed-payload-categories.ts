// scripts/seed-payload-categories.ts
import { config as loadEnv } from 'dotenv';

loadEnv();

async function main(): Promise<void> {
  const { DEFAULT_CATEGORIES } = await import('@/lib/default-categories');
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  for (const category of DEFAULT_CATEGORIES) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: category.slug } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const doc = existing.docs[0]!;
      await payload.update({
        collection: 'categories',
        id: doc.id,
        overrideAccess: true,
        data: {
          title: category.title,
          subtitle: category.subtitle,
        },
      });
      console.log(`[payload] updated category: ${category.slug}`);
      continue;
    }

    await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: {
        title: category.title,
        subtitle: category.subtitle,
        slug: category.slug,
      },
    });
    console.log(`[payload] created category: ${category.title} (${category.slug})`);
  }

  console.log('[payload] category seed complete.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] failed to seed categories: ${message}`);
  process.exit(1);
});
