import Link from 'next/link';
import type { ReactElement } from 'react';
import { getStoreCategories } from '@/lib/shopify';

export default async function SearchEmptyState({
  query,
}: {
  query?: string;
}): Promise<ReactElement> {
  const categories = (await getStoreCategories()).slice(0, 8);

  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-14 w-14 text-neutral-300 dark:text-neutral-600"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m20 20-3.5-3.5" />
      </svg>
      <h2 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {query ? `Không tìm thấy sản phẩm cho "${query}"` : 'Chưa có sản phẩm nào'}
      </h2>
      <p className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
        Thử từ khóa khác, kiểm tra chính tả hoặc khám phá các danh mục bên dưới.
      </p>

      {categories.length > 0 ? (
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/search/${category.slug}`}
                className="inline-flex rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                {category.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href="/search"
        className="mt-8 inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Xem tất cả sản phẩm
      </Link>
    </div>
  );
}
