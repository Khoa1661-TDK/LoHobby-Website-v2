// app/search/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import ProductGrid from '@/components/product/product-grid';
import { defaultSort, sorting } from '@/lib/constants';
import { getProducts } from '@/lib/shopify';

type SearchParams = Promise<{ q?: string; sort?: string }>;

export async function generateMetadata(props: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await props.searchParams;
  const trimmed = q?.trim();

  return {
    title: trimmed ? `Tìm kiếm: "${trimmed}"` : 'Tìm kiếm',
    description: trimmed
      ? `Kết quả tìm kiếm "${trimmed}" trong cửa hàng Lô Hobby.`
      : 'Tìm móc khóa, mô hình, figure & sản phẩm hobby trong cửa hàng.',
    alternates: { canonical: trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search' },
    robots: trimmed
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

export const revalidate = 60;

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

  return (
    <>
      {query ? (
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {products.length === 0
            ? 'Không tìm thấy sản phẩm cho '
            : `Hiển thị ${products.length} kết quả cho `}
          <span className="font-bold text-black dark:text-white">&quot;{query}&quot;</span>
        </p>
      ) : null}
      {products.length > 0 ? <ProductGrid products={products} /> : null}
    </>
  );
}
