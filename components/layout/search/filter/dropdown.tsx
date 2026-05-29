// components/layout/search/filter/dropdown.tsx
'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ListItem } from '@/components/layout/search/filter';
import FilterItem from '@/components/layout/search/filter/item';

export default function FilterItemDropdown({ list }: { list: ListItem[] }): ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openSelect, setOpenSelect] = useState(false);
  const [openEpoch, setOpenEpoch] = useState(0);
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

  const toggle = (): void => {
    setOpenSelect((wasOpen) => {
      if (wasOpen) return false;
      setOpenEpoch((epoch) => epoch + 1);
      return true;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={openSelect}
        aria-haspopup="listbox"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-sm border border-black/30 px-4 py-2 text-sm transition-colors duration-200 hover:border-black/50 dark:border-white/30 dark:hover:border-white/50"
      >
        <div>{active}</div>
        <ChevronDownIcon
          className={clsx(
            'h-4 transition-transform duration-200 ease-out motion-reduce:transition-none',
            openSelect && 'rotate-180',
          )}
        />
      </button>
      <div
        aria-hidden={!openSelect}
        className={clsx(
          'absolute z-40 w-full origin-top',
          'transition-[opacity,transform,visibility] duration-200 ease-out will-change-[opacity,transform]',
          openSelect
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0',
          'motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:scale-100',
        )}
      >
        <div
          role="listbox"
          className="rounded-b-md bg-white p-2 shadow-md dark:bg-black"
        >
          <div key={openEpoch}>
            {list.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className={clsx(openSelect && 'motion-reduce:animate-none animate-dropdown-item')}
                style={openSelect ? { animationDelay: `${itemIndex * 35}ms` } : undefined}
                onClick={() => setOpenSelect(false)}
              >
                <FilterItem item={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
