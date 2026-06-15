// app/search/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import SearchEmptyState from '@/components/layout/search/empty-state';
import Pagination from '@/components/pagination';
import ProductGrid from '@/components/product/product-grid';
import { getSiteName } from '@/lib/brand';
import { defaultSort, sorting } from '@/lib/constants';
import { paginateList } from '@/lib/listing-pagination';
import { applyProductFilters, parseProductFilters } from '@/lib/product-filters';
import { getProducts } from '@/lib/shopify';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'search' });
  const { q } = await props.searchParams;
  const trimmed = q?.trim();
  const title = trimmed ? t('metaTitleWithQuery', { query: trimmed }) : t('metaTitle');
  const description = trimmed
    ? t('metaDescriptionWithQuery', { query: trimmed, storeName: siteName })
    : t('metaDescription');
  const canonical = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search';

  return {
    title,
    description,
    alternates: { canonical },
    robots: trimmed ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(canonical),
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export const revalidate = 60;

export default async function SearchPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const [searchParams, { locale }] = await Promise.all([
    props.searchParams,
    props.params,
  ]);

  const t = await getTranslations({ locale, namespace: 'search' });
  const { q: query, sort } = searchParams;
  const sortOption = sorting.find((item) => item.slug === sort) ?? defaultSort;

  const allProducts = await getProducts({
    query,
    reverse: sortOption.reverse,
    sortKey: sortOption.sortKey,
  });

  const filters = parseProductFilters(searchParams);
  const filtered = applyProductFilters(allProducts, filters);

  const { page: products, currentPage, totalPages } = paginateList(
    filtered,
    searchParams.page,
  );

  const trimmedQuery = query?.trim();

  return (
    <>
      <Breadcrumbs
        items={[
          { name: t('breadcrumbHome'), href: '/' },
          { name: trimmedQuery ? t('breadcrumbSearch') : t('breadcrumbStore') },
        ]}
      />
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100 sm:text-3xl">
        {trimmedQuery ? t('resultsCount', { count: filtered.length }) + ` "${trimmedQuery}"` : t('allProducts')}
      </h1>
      {filtered.length > 0 ? (
        <p className="mb-5 text-sm text-warm-500 dark:text-warm-400">
          {trimmedQuery ? (
            <>
              {t('resultsCount', { count: filtered.length })}{' '}
              <span className="font-semibold text-warm-900 dark:text-warm-100">
                &quot;{trimmedQuery}&quot;
              </span>
            </>
          ) : (
            t('productCount', { count: filtered.length })
          )}
        </p>
      ) : null}
      {filtered.length > 0 ? (
        <>
          <ProductGrid products={products} />
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </>
      ) : (
        <SearchEmptyState query={trimmedQuery} />
      )}
    </>
  );
}