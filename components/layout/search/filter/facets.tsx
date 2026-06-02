'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

export default function Facets(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [priceMin, setPriceMin] = useState(searchParams.get('price_min') ?? '');
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') ?? '');
  const inStock = searchParams.get('in_stock') === '1';

  useEffect(() => {
    setPriceMin(searchParams.get('price_min') ?? '');
    setPriceMax(searchParams.get('price_max') ?? '');
  }, [searchParams]);

  function buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const sort = searchParams.get('sort');
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    return params;
  }

  function pushParams(params: URLSearchParams): void {
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onApplyPrice(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const params = buildParams();
    if (inStock) params.set('in_stock', '1');
    if (priceMin.trim()) params.set('price_min', String(Math.max(0, Number(priceMin) || 0)));
    if (priceMax.trim()) params.set('price_max', String(Math.max(0, Number(priceMax) || 0)));
    pushParams(params);
  }

  function toggleInStock(): void {
    const params = buildParams();
    if (priceMin.trim()) params.set('price_min', priceMin.trim());
    if (priceMax.trim()) params.set('price_max', priceMax.trim());
    if (!inStock) params.set('in_stock', '1');
    pushParams(params);
  }

  function clearAll(): void {
    pushParams(buildParams());
  }

  const hasActive =
    inStock || Boolean(searchParams.get('price_min')) || Boolean(searchParams.get('price_max'));

  return (
    <div className="hidden md:block">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">Lọc</h3>

      <form onSubmit={onApplyPrice} className="mt-3 space-y-2.5">
        <label className="block text-xs text-warm-500 dark:text-warm-400">Khoảng giá (đ)</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Từ"
            className="w-full rounded-lg border border-warm-200/80 bg-white px-2.5 py-1.5 text-xs text-warm-700 placeholder:text-warm-400 transition-colors focus:border-terracotta-400 focus:outline-none dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:placeholder:text-warm-600"
          />
          <span className="text-warm-400 text-xs">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Đến"
            className="w-full rounded-lg border border-warm-200/80 bg-white px-2.5 py-1.5 text-xs text-warm-700 placeholder:text-warm-400 transition-colors focus:border-terracotta-400 focus:outline-none dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:placeholder:text-warm-600"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-warm-900 px-2.5 py-1.5 text-xs font-semibold text-warm-50 transition-colors hover:bg-warm-800 dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          Áp dụng
        </button>
      </form>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-warm-700 dark:text-warm-300">
        <input
          type="checkbox"
          checked={inStock}
          onChange={toggleInStock}
          className="h-4 w-4 rounded border-warm-300 text-terracotta-500 focus:ring-terracotta-400 dark:border-warm-700 dark:bg-warm-900"
        />
        Chỉ còn hàng
      </label>

      {hasActive ? (
        <button
          type="button"
          onClick={clearAll}
          className="mt-3 text-xs text-terracotta-600 transition-colors hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
        >
          Xóa bộ lọc
        </button>
      ) : null}
    </div>
  );
}