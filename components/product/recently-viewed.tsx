'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';
import Price from '@/components/price';
import { readRecentlyViewed, recordRecentlyViewed, type RecentProduct } from '@/lib/recently-viewed';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

type Props = {
  /** When provided, records this product on mount and excludes it from the list. */
  current?: RecentProduct;
  title?: string;
};

export default function RecentlyViewed({
  current,
  title = 'Đã xem gần đây',
}: Props): ReactElement | null {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    if (current) recordRecentlyViewed(current);
    const all = readRecentlyViewed().filter((item) => item.handle !== current?.handle);
    setItems(all);
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="py-8" aria-label={title}>
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1">
        {items.map((item) => (
          <li
            key={item.handle}
            className="w-36 flex-none sm:w-40 md:w-44"
          >
            <Link href={`/product/${item.handle}`} prefetch className="group block">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
                <Image
                  src={toNextImageSrc(item.image)}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 176px, 144px"
                  className="img-fit p-2 transition duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-neutral-800 dark:text-neutral-200">
                {item.title}
              </p>
              <Price
                amount={item.price}
                currencyCode={item.currencyCode}
                className="text-sm font-semibold text-red-600 dark:text-red-400"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
