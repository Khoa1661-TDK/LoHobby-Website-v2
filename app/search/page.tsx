// app/search/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Grid from '@/components/grid';
import ProductGridItems from '@/components/grid/product-grid-items';
import { defaultSort, sorting } from '@/lib/constants';
import { getProducts } from '@/lib/shopify';

type SearchParams = Promise<{ q?: string; sort?: string }>;

export async function generateMetadata(props: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await props.searchParams;
  const trimmed = q?.trim();

  return {
    title: trimmed ? `Search results for "${trimmed}"` : 'Search',
    description: trimmed
      ? `Browse products matching "${trimmed}" in our catalog.`
      : 'Search for products in the store.',
    alternates: { canonical: trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search' },
    robots: trimmed
      ? { index: false, follow: true } // search result pages should not be indexed
      : { index: true, follow: true },
  };
}

export const revalidate = 0;

export default async function SearchPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { q: query, sort } = await props.searchParams;
  const sortOption = sorting.find((item) => item.slug === sort) ?? defaultSort;

  const products = await getProducts({
    query,
    reverse: sortOption.reverse,
    sortKey: sortOption.sortKey,
  });

  const resultsText = products.length > 1 ? 'results' : 'result';

  return (
    <>
      {query ? (
        <p className="mb-4">
          {products.length === 0
            ? 'There are no products that match '
            : `Showing ${products.length} ${resultsText} for `}
          <span className="font-bold">&quot;{query}&quot;</span>
        </p>
      ) : null}
      {products.length > 0 ? (
        <Grid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          <ProductGridItems products={products} />
        </Grid>
      ) : null}
    </>
  );
}
