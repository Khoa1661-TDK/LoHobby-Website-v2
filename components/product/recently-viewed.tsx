'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactElement } from 'react';
import Price from '@/components/price';
import { readRecentlyViewed, recordRecentlyViewed, type RecentProduct } from '@/lib/recently-viewed';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

type Props = {
  current?: RecentProduct;
  title?: string;
};

export default function RecentlyViewed({
  current,
  title,
}: Props): ReactElement | null {
  const t = useTranslations('product');
  const resolvedTitle = title ?? t('recentlyViewed');
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    if (current) recordRecentlyViewed(current);
    const all = readRecentlyViewed().filter((item) => item.handle !== current?.handle);
    setItems(all);
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="py-10" aria-label={resolvedTitle}>
      <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">{resolvedTitle}</h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1 pb-2">
        {items.map((item) => (
          <li
            key={item.handle}
            className="w-36 flex-none sm:w-40 md:w-44"
          >
            <Link href={`/product/${item.handle}`} prefetch className="group block">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-warm-200/80 bg-warm-100/50 dark:border-warm-800/40 dark:bg-warm-950">
                <Image
                  src={toNextImageSrc(item.image)}
                  alt={item.title}
                  fill
                  sizes="(min-width: 768px) 176px, 144px"
                  className="img-fit p-2 transition duration-500 ease-smooth group-hover:scale-105"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-medium text-warm-800 dark:text-warm-200">
                {item.title}
              </p>
              <Price
                amount={item.price}
                currencyCode={item.currencyCode}
                className="text-sm font-semibold text-terracotta-600 dark:text-terracotta-400"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}