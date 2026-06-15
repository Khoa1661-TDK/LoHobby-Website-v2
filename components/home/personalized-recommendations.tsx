'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useEffect, useState, type ReactElement } from 'react';
import Price from '@/components/price';
import type { RecommendedProduct } from '@/app/api/recommendations/route';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

export default function PersonalizedRecommendations(): ReactElement | null {
  const t = useTranslations('home');
  const [products, setProducts] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/recommendations', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products?: RecommendedProduct[] }) => {
        if (active) setProducts(data.products ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-screen-2xl px-4 py-5 sm:py-6"
      aria-labelledby="recommendations-heading"
    >
      <h2 id="recommendations-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
        {t('recommendationsHeading')}
      </h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {t('recommendationsSubtitle')}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5 lg:gap-3">
        {products.map((product) => (
          <Link
            key={product.handle}
            href={`/product/${product.handle}`}
            prefetch
            className="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
            aria-label={product.title}
          >
            <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-neutral-950">
              <Image
                src={toNextImageSrc(product.image)}
                alt={product.imageAlt}
                fill
                sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
                className="img-fit p-2 transition duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-2 sm:p-2.5">
              <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-neutral-800 dark:text-neutral-200 sm:text-sm">
                {product.title}
              </p>
              <Price
                amount={product.price}
                currencyCode={product.currencyCode}
                currencyCodeClassName="text-[10px] sm:text-xs"
                className="mt-auto text-sm font-semibold text-red-600 dark:text-red-400 sm:text-base"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}