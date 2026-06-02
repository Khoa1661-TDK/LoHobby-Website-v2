// components/home/category-section-header.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { StoreCategory } from '@/lib/categories';

type Props = {
  category: StoreCategory;
  productCount: number;
};

export default function CategorySectionHeader({
  category,
  productCount,
}: Props): ReactElement {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-warm-200/60 pb-4 dark:border-warm-800/30">
      <div className="min-w-0">
        <h2
          id={`${category.slug}-heading`}
          className="text-xl font-bold tracking-tight text-warm-900 sm:text-2xl dark:text-warm-100"
        >
          {category.title}
          <span className="ml-2 text-sm font-normal text-warm-400 dark:text-warm-500">
            {productCount}
          </span>
        </h2>
        {category.subtitle ? (
          <p className="mt-1 line-clamp-1 text-sm text-warm-500 dark:text-warm-400">
            {category.subtitle}
          </p>
        ) : null}
      </div>
      <Link
        href={`/search/${category.slug}`}
        prefetch
        className="shrink-0 text-sm font-medium text-terracotta-600 transition-colors duration-200 hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
      >
        Xem tất cả →
      </Link>
    </div>
  );
}