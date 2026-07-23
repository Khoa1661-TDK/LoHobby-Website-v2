// components/product/product-card.tsx — editorial product tile
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import WishlistButton from '@/components/wishlist/wishlist-button';
import ProductCardTracker from '@/components/product/product-card-tracker';
import {
  BADGE_STYLES,
  getDiscountPercent,
  getProductBadge,
} from '@/lib/categories';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { Product } from '@/lib/shopify/types';

type Props = {
  product: Product;
  priority?: boolean;
  index?: number;
};

export default function ProductCard({ product, priority, index = 0 }: Props): ReactElement {
  const t = useTranslations('product');
  const badge = getProductBadge(product.tags);
  const soldOut = badge === 'sold-out';
  const price = product.priceRange.minVariantPrice;
  const discountPercent = getDiscountPercent(product);
  const href = product.handle ? `/product/${product.handle}` : '/search';

  return (
    <Link
      href={href}
      prefetch
      className={`group flex h-full flex-col overflow-hidden rounded-card border border-warm-200/80 bg-white shadow-soft-sm transition-all duration-300 hover:-translate-y-1 hover:border-warm-300/80 hover:shadow-soft-md dark:border-warm-800/40 dark:bg-warm-900 dark:hover:border-warm-700/60 dark:hover:shadow-soft-lg ${
        soldOut ? 'opacity-75' : ''
      }`}
      aria-label={product.title}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      {/* Image area */}
      <div className="relative aspect-square overflow-hidden bg-warm-100/50 dark:bg-warm-950">
        <WishlistButton productId={product.id} productHandle={product.handle} />

        <Image
          src={toNextImageSrc(product.featuredImage.url)}
          alt={product.featuredImage.altText || product.title}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
          className="img-fit p-3 transition duration-500 ease-smooth group-hover:scale-[1.06] group-hover:p-2"
        />

        {/* Discount badge */}
        {discountPercent ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-warm-900 px-2.5 py-1 text-[11px] font-bold text-warm-50 shadow-sm dark:bg-warm-100 dark:text-warm-900">
            -{discountPercent}%
          </span>
        ) : null}

        {/* Product badge */}
        {badge && !discountPercent ? (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm ${BADGE_STYLES[badge]}`}
          >
            {t(badge === 'new' ? 'badgeNew' : 'badgeSoldOut')}
          </span>
        ) : null}

        {/* Quick-view overlay on hover; always shown on touch devices */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-warm-900/60 via-transparent to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <span className="rounded-full bg-white/95 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-warm-900 shadow-soft-sm backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 translate-y-2 dark:bg-warm-50 dark:text-warm-900 [@media(hover:none)]:translate-y-0">
            {t('viewDetails')}
          </span>
        </div>
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
        <p className="line-clamp-2 min-h-[2.75rem] text-sm font-medium leading-snug text-warm-800 dark:text-warm-200">
          {product.title}
        </p>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <Price
            amount={price.amount}
            currencyCode={price.currencyCode}
            currencyCodeClassName="text-[10px] sm:text-xs"
            className="text-sm font-bold text-warm-900 sm:text-base dark:text-warm-100"
          />
          {price.compareAtAmount ? (
            <Price
              amount={price.compareAtAmount}
              currencyCode={price.currencyCode}
              currencyCodeClassName="text-[9px] sm:text-[10px]"
              className="text-xs text-warm-400 line-through decoration-warm-300 dark:text-warm-500 dark:decoration-warm-600"
            />
          ) : null}
        </div>
      </div>

      <ProductCardTracker productId={product.id} productHandle={product.handle} />
    </Link>
  );
}