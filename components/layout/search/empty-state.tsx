import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import { getStoreCategories } from '@/lib/shopify';

export default async function SearchEmptyState({
  query,
  hasActiveFilters,
}: {
  query?: string;
  hasActiveFilters?: boolean;
}): Promise<ReactElement> {
  const t = await getTranslations('search');
  const categories = (await getStoreCategories()).slice(0, 8);

  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-warm-100/80 dark:bg-warm-800/50">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-8 w-8 text-warm-400 dark:text-warm-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
      </div>
      <h2 className="mt-6 text-xl font-bold text-warm-900 dark:text-warm-100">
        {t('noResults')}
      </h2>
      <p className="mt-2 max-w-md text-sm text-warm-500 dark:text-warm-400">
        {hasActiveFilters ? t('noFilterResults') : t('tryAdjustingFilter')}
      </p>

      {hasActiveFilters ? (
        <Link
          href={query ? `/search?q=${encodeURIComponent(query)}` : '/search'}
          className="mt-4 text-sm font-medium text-terracotta-600 underline-offset-4 hover:underline dark:text-terracotta-400"
        >
          {t('filter.clear')}
        </Link>
      ) : null}

      {categories.length > 0 ? (
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/search/${category.slug}`}
                className="inline-flex rounded-xl border border-warm-200/80 bg-white px-4 py-2 text-sm font-medium text-warm-700 shadow-soft-sm transition-all duration-200 hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:hover:border-terracotta-700 dark:hover:bg-terracotta-950/50 dark:hover:text-terracotta-300"
              >
                {category.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href="/search"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-6 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
      >
        {t('allProducts')}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </div>
  );
}