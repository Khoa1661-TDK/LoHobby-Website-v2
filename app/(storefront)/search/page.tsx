// app/search/page.tsx
import type { Metadata } from 'next';
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
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await props.searchParams;
  const trimmed = q?.trim();
  const title = trimmed ? `Tìm kiếm: "${trimmed}"` : 'Tìm kiếm';
  const description = trimmed
    ? `Kết quả tìm kiếm "${trimmed}" trong cửa hàng ${siteName}.`
    : 'Tìm móc khóa, mô hình, figure & sản phẩm hobby trong cửa hàng.';
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
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const searchParams = await props.searchParams;
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
          { name: 'Trang chủ', href: '/' },
          { name: trimmedQuery ? 'Tìm kiếm' : 'Cửa hàng' },
        ]}
      />
      <h1 className="mb-4 font-serif text-xl font-bold tracking-tight sm:text-2xl">
        {trimmedQuery ? `Kết quả tìm kiếm: "${trimmedQuery}"` : 'Tất cả sản phẩm'}
      </h1>
      {filtered.length > 0 ? (
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {trimmedQuery ? (
            <>
              Hiển thị {filtered.length} kết quả cho{' '}
              <span className="font-bold text-black dark:text-white">
                &quot;{trimmedQuery}&quot;
              </span>
            </>
          ) : (
            `${filtered.length} sản phẩm`
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
