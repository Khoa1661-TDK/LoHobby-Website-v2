// components/layout/search/filter/dropdown.tsx
'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ListItem } from '@/components/layout/search/filter';
import FilterItem from '@/components/layout/search/filter/item';

export default function FilterItemDropdown({ list }: { list: ListItem[] }): ReactElement {
  const t = useTranslations('search');
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
      else if ('slug' in item && searchParams.get('sort') === item.slug) {
        setActive(t(`sort.${item.labelKey}` as Parameters<typeof t>[0]));
      }
    });
  }, [pathname, list, searchParams, t]);

  const first = list[0];
  const firstLabel = first
    ? 'path' in first
      ? first.title
      : t(`sort.${first.labelKey}` as Parameters<typeof t>[0])
    : '';

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
        className="flex w-full items-center justify-between rounded-xl border border-warm-200/80 bg-white px-4 py-2.5 text-sm text-warm-700 transition-all duration-200 hover:border-warm-300/80 hover:shadow-soft-sm dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:hover:border-warm-700/60"
      >
        <span>{active || firstLabel}</span>
        <ChevronDownIcon
          className={clsx(
            'h-4 text-warm-400 transition-transform duration-200 ease-smooth',
            openSelect && 'rotate-180',
          )}
        />
      </button>
      <div
        aria-hidden={!openSelect}
        className={clsx(
          'absolute z-40 w-full origin-top',
          'transition-[opacity,transform,visibility] duration-200 ease-smooth',
          openSelect
            ? 'visible translate-y-0 scale-100 opacity-100'
            : 'invisible pointer-events-none -translate-y-1 scale-[0.98] opacity-0',
          'motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:scale-100',
        )}
      >
        <div
          role="listbox"
          className="rounded-xl bg-white p-2 shadow-soft-lg border border-warm-200/80 dark:border-warm-800/60 dark:bg-warm-900"
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