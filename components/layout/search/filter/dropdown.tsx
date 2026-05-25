// components/layout/search/filter/dropdown.tsx
'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ListItem } from '@/components/layout/search/filter';
import FilterItem from '@/components/layout/search/filter/item';

export default function FilterItemDropdown({ list }: { list: ListItem[] }): ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openSelect, setOpenSelect] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenSelect(false);
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    list.forEach((item) => {
      if ('path' in item && pathname === item.path) setActive(item.title);
      else if ('slug' in item && searchParams.get('sort') === item.slug) setActive(item.title);
    });
  }, [pathname, list, searchParams]);

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpenSelect(!openSelect)}
        className="flex w-full items-center justify-between rounded-sm border border-black/30 px-4 py-2 text-sm dark:border-white/30"
      >
        <div>{active}</div>
        <ChevronDownIcon className="h-4" />
      </div>
      {openSelect ? (
        <div
          onClick={() => setOpenSelect(false)}
          className="absolute z-40 w-full rounded-b-md bg-white p-4 shadow-md dark:bg-black"
        >
          {list.map((item, i) => (
            <FilterItem key={i} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
