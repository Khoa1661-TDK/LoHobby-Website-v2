// components/layout/navbar/search.tsx
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { animate } from 'motion';
import Price from '@/components/price';
import type { SearchSuggestion } from '@/app/api/search/suggest/route';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import { prefersReducedMotion } from '@/lib/animations/config';

export default function Search(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);

  const overlayVisible = open && suggestions.length > 0;

  // Scale + fade the suggestion overlay in from the search icon origin (top
  // right), 200ms (spec §3). Reduced motion: appear instantly.
  useLayoutEffect(() => {
    const el = overlayRef.current;
    if (!el || !overlayVisible) return;
    if (prefersReducedMotion()) {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
      return;
    }
    const controls = animate(
      el,
      { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] },
      { duration: 0.2, ease: 'easeOut' },
    );
    controls.finished
      .then(() => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
      })
      .catch(() => undefined);
    return () => controls.stop();
  }, [overlayVisible]);

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
    }, 200);
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
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={onSubmit} className="relative">
        <input
          type="search"
          name="q"
          placeholder="Tìm móc khóa, mô hình, figure…"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="w-full rounded-xl border border-warm-200/80 bg-warm-100/50 py-2 pl-4 pr-10 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-300 focus:border-warm-300 focus:bg-warm-50 focus:shadow-soft-sm focus:outline-none dark:border-warm-800/60 dark:bg-warm-900/50 dark:text-warm-100 dark:placeholder:text-warm-500 dark:focus:border-warm-700 dark:focus:bg-warm-900/80"
        />
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="absolute right-0 top-0 mr-3 flex h-full items-center text-warm-400 transition-colors hover:text-warm-600 dark:text-warm-500 dark:hover:text-warm-300"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
      </form>

      {overlayVisible ? (
        <ul
          ref={overlayRef}
          style={{ transformOrigin: 'top right' }}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-warm-200/80 bg-white shadow-soft-lg backdrop-blur-xl dark:border-warm-800/60 dark:bg-warm-900"
        >
          {suggestions.map((item, idx) => (
            <li key={item.handle}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/product/${item.handle}`);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-warm-50 dark:hover:bg-warm-800/50"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-warm-100 dark:bg-warm-800">
                  <Image
                    src={toNextImageSrc(item.image)}
                    alt={item.title}
                    fill
                    sizes="44px"
                    className="img-fit p-0.5"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-warm-800 dark:text-warm-200">
                    {item.title}
                  </span>
                  <Price
                    amount={item.price}
                    currencyCode={item.currencyCode}
                    className="text-xs font-semibold text-terracotta-600 dark:text-terracotta-400"
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
    <form className="relative w-full">
      <input
        placeholder="Tìm móc khóa, mô hình, figure…"
        className="w-full rounded-xl border border-warm-200/80 bg-warm-100/50 py-2 pl-4 pr-10 text-sm text-warm-900 placeholder:text-warm-400 dark:border-warm-800/60 dark:bg-warm-900/50 dark:text-warm-100 dark:placeholder:text-warm-500"
      />
      <div className="absolute right-0 top-0 mr-3 flex h-full items-center text-warm-400">
        <MagnifyingGlassIcon className="h-4 w-4" />
      </div>
    </form>
  );
}