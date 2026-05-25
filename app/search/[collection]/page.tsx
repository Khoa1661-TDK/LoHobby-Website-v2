// app/search/[collection]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import Grid from '@/components/grid';
import ProductGridItems from '@/components/grid/product-grid-items';
import { defaultSort, sorting } from '@/lib/constants';
import { getCollection, getCollectionProducts } from '@/lib/shopify';

export const revalidate = 0;

type Params = Promise<{ collection: string }>;
type SearchParams = Promise<{ sort?: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { collection } = await props.params;
  const data = await getCollection(collection);
  if (!data) return notFound();

  const title = data.seo.title || data.title;
  const description = data.seo.description || data.description || `${data.title} products`;

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
    <section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <h1 className="sr-only">{data.title}</h1>
      {products.length === 0 ? (
        <p className="py-3 text-lg">No products found in this collection</p>
      ) : (
        <Grid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <ProductGridItems products={products} />
        </Grid>
      )}
    </section>
  );
}
