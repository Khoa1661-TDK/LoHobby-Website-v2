'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { CategoryNavItem } from '@/components/layout/search/collections-nav';

export default function CategoriesDropdown({
  items,
}: {
  items: CategoryNavItem[];
}): ReactElement | null {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const isCategoryActive = items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  if (!items.length) return null;

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1 text-sm underline-offset-4 hover:underline',
          isCategoryActive
            ? 'text-black dark:text-white'
            : 'text-neutral-500 dark:text-neutral-400',
        )}
      >
        Danh mục
        <ChevronDownIcon className={clsx('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-neutral-200 bg-white py-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
          <ul className="max-h-80 overflow-y-auto [scrollbar-width:thin]">
            <li>
              <Link
                href="/search"
                prefetch
                onClick={() => setOpen(false)}
                className={clsx(
                  'block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900',
                  pathname === '/search' && 'font-medium underline underline-offset-4',
                )}
              >
                Tất cả sản phẩm
              </Link>
            </li>
            {items.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  prefetch
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'block px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900',
                    pathname === item.path && 'font-medium underline underline-offset-4',
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
