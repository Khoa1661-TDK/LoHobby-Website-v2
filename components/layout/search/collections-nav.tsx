'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactElement } from 'react';

export type CategoryNavItem = {
  title: string;
  path: string;
};

export default function CollectionsNav({ items }: { items: CategoryNavItem[] }): ReactElement {
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
    <nav aria-label="Danh mục sản phẩm">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Danh mục
      </h3>

      {/* Mobile: compact dropdown */}
      <div className="relative md:hidden" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <span className="truncate">{activeItem?.title ?? 'Danh mục'}</span>
          <ChevronDownIcon className={clsx('h-4 w-4 shrink-0 transition', open && 'rotate-180')} />
        </button>
        {open ? (
          <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {items.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    prefetch
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800',
                      active && 'font-medium text-black underline underline-offset-4 dark:text-white',
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

      {/* Desktop: scrollable list for many categories */}
      <ul className="hidden max-h-[min(70vh,32rem)] overflow-y-auto pr-1 md:block [scrollbar-width:thin]">
        {items.map((item) => {
          const active = pathname === item.path;
          return (
            <li key={item.path} className="mt-1.5 first:mt-0">
              <Link
                href={item.path}
                prefetch
                className={clsx(
                  'block text-sm leading-snug underline-offset-4 hover:underline',
                  active
                    ? 'font-medium text-black underline dark:text-white'
                    : 'text-neutral-700 dark:text-neutral-300',
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
