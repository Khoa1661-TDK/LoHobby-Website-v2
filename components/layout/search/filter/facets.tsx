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
    // Page resets to 1 whenever filters change.
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
      <h3 className="text-xs text-neutral-500 dark:text-neutral-400">Lọc</h3>

      <form onSubmit={onApplyPrice} className="mt-2 space-y-2">
        <label className="block text-xs text-neutral-500 dark:text-neutral-400">Khoảng giá (đ)</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Từ"
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Đến"
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white dark:bg-white dark:text-black"
        >
          Áp dụng
        </button>
      </form>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-black dark:text-white">
        <input type="checkbox" checked={inStock} onChange={toggleInStock} className="h-4 w-4" />
        Chỉ còn hàng
      </label>

      {hasActive ? (
        <button
          type="button"
          onClick={clearAll}
          className="mt-3 text-xs text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          Xóa bộ lọc
        </button>
      ) : null}
    </div>
  );
}
