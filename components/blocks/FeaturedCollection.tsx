// components/blocks/FeaturedCollection.tsx
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import ProductCard from '@/components/product/product-card';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getCollectionProducts } from '@/lib/shopify';

type Props = {
  title?: string | null;
  collection?: { title?: string; slug?: string } | string | null;
  limit?: number;
  layout?: 'grid' | 'carousel' | null;
} & BlockAppearance;

export default async function FeaturedCollectionBlock(props: Props): Promise<ReactElement> {
  const { title, collection, limit = 8, layout = 'grid' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const collectionSlug =
    typeof collection === 'object' && collection !== null
      ? collection.slug
      : typeof collection === 'string'
        ? collection
        : null;

  if (!collectionSlug) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-warm-500">
            No collection selected — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  const collectionTitle =
    title ??
    (typeof collection === 'object' && collection !== null ? collection.title : undefined) ??
    collectionSlug;

  const products = await getCollectionProducts({
    collection: collectionSlug,
    sortKey: 'CREATED_AT',
    reverse: true,
  });

  if (products.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-warm-500">No products found.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className="flex items-end justify-between gap-4 border-b border-warm-200/60 pb-4 dark:border-warm-800/30">
          <h2 className="text-xl font-bold tracking-tight text-warm-900 sm:text-2xl dark:text-warm-100">
            {collectionTitle}
          </h2>
          <Link
            href={`/search/${collectionSlug}`}
            prefetch
            className="shrink-0 text-sm font-medium text-terracotta-600 transition-colors duration-200 hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
          >
            Xem tất cả →
          </Link>
        </div>
        <div
          className={
            layout === 'carousel'
              ? 'mt-6 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide'
              : 'mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
          }
        >
          {products.slice(0, limit).map((product) => (
            <div
              key={product.handle}
              className={layout === 'carousel' ? 'min-w-[250px] snap-start' : ''}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
