// components/layout/navbar/search.tsx
'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { animate } from 'motion';
import Price from '@/components/price';
import type { SearchSuggestion } from '@/app/api/search/suggest/route';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import { prefersReducedMotion } from '@/lib/animations/config';

export default function Search(): ReactElement {
  const t = useTranslations('search');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  // The overlay is shown once a search has run, even with zero results, so the
  // shopper gets a "no matches" affordance rather than a silently empty box.
  const overlayVisible = open && searched;
  const hasSuggestions = suggestions.length > 0;
  const activeOptionId =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

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

  const queryParam = searchParams.get('q');
  useEffect(() => {
    setValue(queryParam ?? '');
  }, [queryParam]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearched(false);
      setActiveIndex(-1);
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
          setSearched(true);
          setActiveIndex(-1);
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

  function goToProduct(handle: string): void {
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/product/${handle}`);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Enter with an option highlighted selects that option instead of
    // submitting the raw query.
    const active = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
    if (active) {
      goToProduct(active.handle);
      return;
    }
    const q = value.trim();
    setOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!overlayVisible || !hasSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={onSubmit} className="relative" role="search">
        <input
          type="search"
          name="q"
          role="combobox"
          aria-expanded={overlayVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder={t('placeholder')}
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => searched && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-pill border border-warm-200/80 bg-warm-100/50 py-2 pl-4 pr-10 text-sm text-warm-900 placeholder:text-warm-400 transition-all duration-300 focus:border-warm-300 focus:bg-warm-50 focus:shadow-soft-sm focus:outline-none dark:border-warm-800/60 dark:bg-warm-900/50 dark:text-warm-100 dark:placeholder:text-warm-500 dark:focus:border-warm-700 dark:focus:bg-warm-900/80"
        />
        <button
          type="submit"
          aria-label={t('submitAria')}
          className="absolute right-0 top-0 mr-3 flex h-full items-center text-warm-400 transition-colors hover:text-warm-600 dark:text-warm-500 dark:hover:text-warm-300"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
      </form>

      {/* Announces only the result count. The zero-results case is conveyed
          by the "no results" row inside the listbox itself, so the live
          region doesn't duplicate that exact text into a second DOM node. */}
      <span aria-live="polite" className="sr-only">
        {overlayVisible && hasSuggestions ? t('suggestionCount', { count: suggestions.length }) : ''}
      </span>

      {overlayVisible ? (
        <ul
          ref={overlayRef}
          id={listboxId}
          role="listbox"
          aria-label={t('suggestionsAria')}
          style={{ transformOrigin: 'top right' }}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-warm-200/80 bg-white shadow-soft-lg backdrop-blur-xl dark:border-warm-800/60 dark:bg-warm-900"
        >
          {hasSuggestions ? (
            suggestions.map((item, idx) => (
              <li
                key={item.handle}
                id={`${listboxId}-option-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => goToProduct(item.handle)}
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx === activeIndex
                    ? 'bg-warm-50 dark:bg-warm-800/50'
                    : 'hover:bg-warm-50 dark:hover:bg-warm-800/50'
                }`}
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
                    className="text-xs font-semibold text-warm-900 dark:text-warm-100"
                  />
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-warm-500 dark:text-warm-400">
              {t('noResults')}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function SearchSkeleton(): ReactElement {
  const t = useTranslations('search');
  return (
    <form className="relative w-full">
      <input
        placeholder={t('placeholder')}
        className="w-full rounded-pill border border-warm-200/80 bg-warm-100/50 py-2 pl-4 pr-10 text-sm text-warm-900 placeholder:text-warm-400 dark:border-warm-800/60 dark:bg-warm-900/50 dark:text-warm-100 dark:placeholder:text-warm-500"
      />
      <div className="absolute right-0 top-0 mr-3 flex h-full items-center text-warm-400">
        <MagnifyingGlassIcon className="h-4 w-4" />
      </div>
    </form>
  );
}
