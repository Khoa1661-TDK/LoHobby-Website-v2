import Link from 'next/link';
import type { ReactElement } from 'react';

export type Crumb = { name: string; href?: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }): ReactElement {
  return (
    <nav aria-label="Đường dẫn" className="py-4 text-sm text-warm-500 dark:text-warm-400">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors duration-200 hover:text-warm-800 dark:hover:text-warm-200">
                  {item.name}
                </Link>
              ) : (
                <span
                  className={isLast ? 'font-medium text-warm-900 dark:text-warm-100' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.name}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden className="text-warm-300 dark:text-warm-700">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}