'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { PAGE_SIZE } from '@/lib/constants';

export { PAGE_SIZE };

export default function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}): ReactElement | null {
  const t = useTranslations('common');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefForPage = (page: number): string => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  for (let page = start; page <= end; page += 1) pages.push(page);

  const linkClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-all duration-200';

  return (
    <nav aria-label={t('paginationAria')} className="mt-10 flex items-center justify-center gap-1.5">
      {currentPage > 1 ? (
        <Link
          href={hrefForPage(currentPage - 1)}
          className={`${linkClass} border-warm-200/80 text-warm-600 hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:border-warm-700 dark:hover:bg-warm-900 dark:hover:text-warm-200`}
        >
          ←
        </Link>
      ) : null}

      {pages.map((page) => (
        <Link
          key={page}
          href={hrefForPage(page)}
          aria-current={page === currentPage ? 'page' : undefined}
          className={`${linkClass} ${
            page === currentPage
              ? 'border-warm-900 bg-warm-900 text-warm-50 shadow-soft-sm dark:border-warm-100 dark:bg-warm-100 dark:text-warm-900'
              : 'border-warm-200/80 text-warm-600 hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:border-warm-700 dark:hover:bg-warm-900 dark:hover:text-warm-200'
          }`}
        >
          {page}
        </Link>
      ))}

      {currentPage < totalPages ? (
        <Link
          href={hrefForPage(currentPage + 1)}
          className={`${linkClass} border-warm-200/80 text-warm-600 hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:border-warm-700 dark:hover:bg-warm-900 dark:hover:text-warm-200`}
        >
          →
        </Link>
      ) : null}
    </nav>
  );
}