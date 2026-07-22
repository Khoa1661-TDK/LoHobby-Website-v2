'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Link } from '@/i18n/navigation';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactElement } from 'react';

export type CategoryNavItem = {
  title: string;
  path: string;
};

export default function CollectionsNav({ items }: { items: CategoryNavItem[] }): ReactElement {
  const t = useTranslations('search');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const activeItem = items.find((item) => pathname === item.path) ?? items[0];

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  return (
    <nav aria-label={t('filter.categoriesAria')}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
        {t('filter.categories')}
      </h3>

      <div className="relative md:hidden" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-xl border border-warm-200/80 bg-white px-4 py-2.5 text-sm dark:border-warm-800/60 dark:bg-warm-900"
        >
          <span className="truncate text-warm-700 dark:text-warm-300">{activeItem?.title ?? t('filter.categories')}</span>
          <ChevronDownIcon className={clsx('h-4 w-4 shrink-0 text-warm-400 transition', open && 'rotate-180')} />
        </button>
        {open ? (
          <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-warm-200/80 bg-white py-1 shadow-soft-lg dark:border-warm-800/60 dark:bg-warm-900">
            {items.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    prefetch
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'block px-4 py-2 text-sm transition-colors hover:bg-warm-50 dark:hover:bg-warm-800/50',
                      active && 'font-medium text-terracotta-600 dark:text-terracotta-400',
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <ul className="hidden max-h-[min(70vh,32rem)] overflow-y-auto pr-1 md:block [scrollbar-width:thin]">
        {items.map((item) => {
          const active = pathname === item.path;
          return (
            <li key={item.path} className="mt-1 first:mt-0">
              <Link
                href={item.path}
                prefetch
                className={clsx(
                  'block rounded-lg px-2.5 py-1.5 text-sm leading-snug transition-colors duration-150',
                  active
                    ? 'bg-terracotta-50 font-medium text-terracotta-700 dark:bg-terracotta-950/40 dark:text-terracotta-300'
                    : 'text-warm-600 hover:bg-warm-50 hover:text-warm-900 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200',
                )}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}