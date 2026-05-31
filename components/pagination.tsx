'use client';

import Link from 'next/link';
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

  // Show a compact window of page numbers around the current page.
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  for (let page = start; page <= end; page += 1) pages.push(page);

  const linkClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm transition';

  return (
    <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-2">
      {currentPage > 1 ? (
        <Link
          href={hrefForPage(currentPage - 1)}
          className={`${linkClass} border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`}
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
              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800'
          }`}
        >
          {page}
        </Link>
      ))}

      {currentPage < totalPages ? (
        <Link
          href={hrefForPage(currentPage + 1)}
          className={`${linkClass} border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800`}
        >
          →
        </Link>
      ) : null}
    </nav>
  );
}
