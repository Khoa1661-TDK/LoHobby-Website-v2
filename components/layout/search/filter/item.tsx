// components/layout/search/filter/item.tsx
'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import type { SortFilterItem } from '@/lib/constants';
import { createUrl } from '@/lib/utils';
import type { ListItem, PathFilterItem } from '@/components/layout/search/filter';

function PathItem({ item }: { item: PathFilterItem }): ReactElement {
  const pathname = usePathname();
  const active = pathname === item.path;
  return (
    <li className="mt-2 flex text-black dark:text-white">
      <Link
        href={item.path}
        prefetch
        className={clsx(
          'w-full text-sm underline-offset-4 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0',
          'hover:translate-x-1 hover:underline hover:text-neutral-700 dark:hover:text-neutral-200',
          { underline: active },
        )}
      >
        {item.title}
      </Link>
    </li>
  );
}

function SortItem({ item }: { item: SortFilterItem }): ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get('sort') === item.slug;

  const q = searchParams.get('q');
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (item.slug) params.set('sort', item.slug);

  const href = createUrl(pathname, params);

  return (
    <li className="mt-2 flex text-sm text-black dark:text-white">
      <Link
        prefetch
        href={href}
        className={clsx(
          'w-full transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0',
          'hover:translate-x-1 hover:underline hover:underline-offset-4 hover:text-neutral-700 dark:hover:text-neutral-200',
          { underline: active },
        )}
      >
        {item.title}
      </Link>
    </li>
  );
}

export default function FilterItem({ item }: { item: ListItem }): ReactElement {
  return 'path' in item ? <PathItem item={item} /> : <SortItem item={item} />;
}
