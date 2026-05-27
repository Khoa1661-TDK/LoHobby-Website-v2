// components/home/category-section.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import CategorySectionHeader from '@/components/home/category-section-header';
import ProductGrid from '@/components/product/product-grid';
import type { StoreCategory } from '@/lib/categories';
import type { Product } from '@/lib/shopify/types';

type Props = {
  category: StoreCategory;
  products: Product[];
};

const PREVIEW_COUNT = 10;

export default function CategorySection({ category, products }: Props): ReactElement | null {
  if (products.length === 0) {
    return null;
  }

  const visible = products.slice(0, PREVIEW_COUNT);

  return (
    <section
      id={category.slug}
      className="mx-auto max-w-screen-2xl scroll-mt-24 px-4 py-5 sm:py-6"
      aria-labelledby={`${category.slug}-heading`}
    >
      <CategorySectionHeader category={category} productCount={products.length} />

      <div className="mt-3">
        <ProductGrid products={visible} />
      </div>

      {products.length > visible.length ? (
        <div className="mt-4 text-center">
          <Link
            href={`/search/${category.slug}`}
            prefetch
            className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-800 transition hover:border-red-500 hover:text-red-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-red-400 dark:hover:text-red-400"
          >
            Xem thêm {products.length - visible.length} sản phẩm
          </Link>
        </div>
      ) : null}
    </section>
  );
}
