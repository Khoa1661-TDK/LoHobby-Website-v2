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
      className="mx-auto max-w-screen-2xl scroll-mt-28 px-4 py-8 sm:py-10 lg:px-6"
      aria-labelledby={`${category.slug}-heading`}
    >
      <CategorySectionHeader category={category} productCount={products.length} />

      <div className="mt-5">
        <ProductGrid products={visible} />
      </div>

      {products.length > visible.length ? (
        <div className="mt-6 text-center">
          <Link
            href={`/search/${category.slug}`}
            prefetch
            className="inline-flex items-center gap-2 rounded-xl border border-warm-200/80 bg-white px-5 py-2.5 text-sm font-medium text-warm-700 shadow-soft-sm transition-all duration-200 hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 hover:shadow-soft-md dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:hover:border-terracotta-700 dark:hover:bg-terracotta-950/50 dark:hover:text-terracotta-300"
          >
            Xem thêm {products.length - visible.length} sản phẩm
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      ) : null}
    </section>
  );
}