// components/product/product-card.tsx — marketplace-style product tile
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import WishlistButton from '@/components/wishlist/wishlist-button';
import {
  BADGE_LABELS,
  BADGE_STYLES,
  getDiscountPercent,
  getProductBadge,
} from '@/lib/categories';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { Product } from '@/lib/shopify/types';

type Props = {
  product: Product;
  priority?: boolean;
};

export default function ProductCard({ product, priority }: Props): ReactElement {
  const badge = getProductBadge(product.tags);
  const soldOut = badge === 'sold-out';
  const price = product.priceRange.minVariantPrice;
  const discountPercent = getDiscountPercent(product);
  const href = product.handle ? `/product/${product.handle}` : '/search';

  return (
    <Link
      href={href}
      prefetch
      className={`group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600 ${
        soldOut ? 'opacity-80' : ''
      }`}
      aria-label={product.title}
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-50 dark:bg-neutral-950">
        <WishlistButton productId={product.id} productHandle={product.handle} />
        <Image
          src={toNextImageSrc(product.featuredImage.url)}
          alt={product.featuredImage.altText || product.title}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
          className="img-fit p-2 transition duration-300 group-hover:scale-105"
        />
        {badge ? (
          <span
            className={`absolute left-1.5 top-1.5 z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_STYLES[badge]}`}
          >
            {BADGE_LABELS[badge]}
          </span>
        ) : null}
        {discountPercent ? (
          <span className="absolute right-1.5 top-1.5 z-10 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{discountPercent}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2 sm:p-2.5">
        <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-neutral-800 dark:text-neutral-200 sm:text-sm">
          {product.title}
        </p>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2">
          <Price
            amount={price.amount}
            currencyCode={price.currencyCode}
            currencyCodeClassName="text-[10px] sm:text-xs"
            className="text-sm font-semibold text-red-600 dark:text-red-400 sm:text-base"
          />
          {price.compareAtAmount ? (
            <Price
              amount={price.compareAtAmount}
              currencyCode={price.currencyCode}
              currencyCodeClassName="text-[9px] sm:text-[10px]"
              className="text-xs text-neutral-400 line-through dark:text-neutral-500"
            />
          ) : null}
        </div>
      </div>
    </Link>
  );
}
