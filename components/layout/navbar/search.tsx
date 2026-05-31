// components/layout/navbar/search.tsx
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import Price from '@/components/price';
import type { SearchSuggestion } from '@/app/api/search/suggest/route';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

export default function Search(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((data: { suggestions?: SearchSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [value]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const q = value.trim();
    setOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  return (
    <div ref={containerRef} className="w-max-[550px] relative w-full lg:w-80 xl:w-full">
      <form onSubmit={onSubmit} className="relative">
        <input
          type="search"
          name="q"
          placeholder="Tìm móc khóa, mô hình, figure…"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="text-md w-full rounded-lg border bg-white px-4 py-2 text-black placeholder:text-neutral-500 dark:border-neutral-800 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-400 md:text-sm"
        />
        <div className="absolute right-0 top-0 mr-3 flex h-full items-center">
          <MagnifyingGlassIcon className="h-4" />
        </div>
      </form>

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
          {suggestions.map((item) => (
            <li key={item.handle}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/product/${item.handle}`);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                  <Image
                    src={toNextImageSrc(item.image)}
                    alt={item.title}
                    fill
                    sizes="40px"
                    className="img-fit"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-800 dark:text-neutral-100">
                    {item.title}
                  </span>
                  <Price
                    amount={item.price}
                    currencyCode={item.currencyCode}
                    className="text-xs font-semibold text-red-600 dark:text-red-400"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SearchSkeleton(): ReactElement {
  return (
    <form className="w-max-[550px] relative w-full lg:w-80 xl:w-full">
      <input
        placeholder="Tìm móc khóa, mô hình, figure…"
        className="w-full rounded-lg border bg-white px-4 py-2 text-sm text-black placeholder:text-neutral-500 dark:border-neutral-800 dark:bg-transparent dark:text-white dark:placeholder:text-neutral-400"
      />
      <div className="absolute right-0 top-0 mr-3 flex h-full items-center">
        <MagnifyingGlassIcon className="h-4" />
      </div>
    </form>
  );
}
