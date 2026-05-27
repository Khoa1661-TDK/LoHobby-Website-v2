// app/search/[collection]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import CategoryBanner from '@/components/home/category-banner';
import ProductGrid from '@/components/product/product-grid';
import { toStoreCategory } from '@/lib/categories';
import { defaultSort, sorting } from '@/lib/constants';
import { getCollection, getCollectionProducts } from '@/lib/shopify';

export const revalidate = 60;

type Params = Promise<{ collection: string }>;
type SearchParams = Promise<{ sort?: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { collection } = await props.params;
  const data = await getCollection(collection);
  if (!data) return notFound();

  const title = data.seo.title || data.title;
  const description = data.seo.description || data.description || `Sản phẩm ${data.title}`;

  return {
    title,
    description,
    alternates: { canonical: `/search/${data.handle}` },
    openGraph: {
      type: 'website',
      title,
      description,
    },
  };
}

export default async function CategoryPage(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { collection } = await props.params;
  const data = await getCollection(collection);
  if (!data) return notFound();

  const { sort } = await props.searchParams;
  const sortOption = sorting.find((item) => item.slug === sort) ?? defaultSort;

  const products = await getCollectionProducts({
    collection,
    reverse: sortOption.reverse,
    sortKey: sortOption.sortKey,
  });

  const categoryMeta = toStoreCategory({
    handle: collection,
    title: data.title,
    description: data.description,
  });
  const featured = products[0];
  const bannerImage =
    categoryMeta?.bannerSeed && featured
      ? `https://picsum.photos/seed/${categoryMeta.bannerSeed}/1600/640`
      : featured?.featuredImage.url;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: data.title,
    description: data.description,
    hasPart: products.slice(0, 12).map((p) => ({
      '@type': 'Product',
      name: p.title,
      url: `/product/${p.handle}`,
      image: p.featuredImage.url,
      offers: {
        '@type': 'Offer',
        priceCurrency: p.priceRange.minVariantPrice.currencyCode,
        price: p.priceRange.minVariantPrice.amount,
        availability: p.availableForSale
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    })),
  };

  return (
    <section className="pb-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <h1 className="sr-only">{data.title}</h1>

      {categoryMeta && bannerImage && featured ? (
        <CategoryBanner
          category={categoryMeta}
          bannerImage={bannerImage}
          productCount={products.length}
        />
      ) : (
        <header className="mb-6">
          <h2 className="font-serif text-2xl font-bold tracking-tight">{data.title}</h2>
          {data.description ? (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{data.description}</p>
          ) : null}
        </header>
      )}

      {products.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">Chưa có sản phẩm trong danh mục này.</p>
      ) : (
        <div className={categoryMeta && bannerImage ? 'mt-4' : undefined}>
          <ProductGrid products={products} />
        </div>
      )}
    </section>
  );
}
