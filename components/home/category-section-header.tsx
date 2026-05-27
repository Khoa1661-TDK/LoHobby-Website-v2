// components/home/category-section-header.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import { getCategoryIcon } from '@/lib/categories';
import type { StoreCategory } from '@/lib/categories';

type Props = {
  category: StoreCategory;
  productCount: number;
};

export default function CategorySectionHeader({
  category,
  productCount,
}: Props): ReactElement {
  const icon = getCategoryIcon(category.slug);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
      <div className="min-w-0">
        <h2
          id={`${category.slug}-heading`}
          className="flex items-center gap-2 text-base font-bold tracking-tight sm:text-lg"
        >
          <span aria-hidden="true">{icon}</span>
          <span className="truncate">{category.title}</span>
          <span className="shrink-0 text-xs font-normal text-neutral-500 dark:text-neutral-400">
            ({productCount})
          </span>
        </h2>
        {category.subtitle ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
            {category.subtitle}
          </p>
        ) : null}
      </div>
      <Link
        href={`/search/${category.slug}`}
        prefetch
        className="shrink-0 text-xs font-medium text-red-600 hover:underline sm:text-sm dark:text-red-400"
      >
        Xem tất cả
      </Link>
    </div>
  );
}
