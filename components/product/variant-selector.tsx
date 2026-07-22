// components/product/variant-selector.tsx
'use client';

import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import AddToCart from '@/components/cart/add-to-cart';
import { GalleryMediaThumb, GalleryMediaViewer } from '@/components/product/gallery-media';
import Price from '@/components/price';
import Prose from '@/components/prose';
import WishlistButton from '@/components/wishlist/wishlist-button';
import type { StorefrontVariant } from '@/lib/payload-products';
import type { Image as ImageType, Product } from '@/lib/shopify/types';

type Props = {
  product: Product;
  basePrice: number;
  baseCompareAtPrice?: number | null;
  variants: StorefrontVariant[];
};

export default function VariantSelector({
  product,
  basePrice,
  baseCompareAtPrice = null,
  variants,
}: Props): ReactElement {
  const t = useTranslations('product');
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [hoverGalleryIndex, setHoverGalleryIndex] = useState<number | null>(null);
  const [heroFromGallery, setHeroFromGallery] = useState(false);
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Show the mobile sticky bar only once the main buy box has scrolled out of
  // view, so it doesn't duplicate the primary add-to-cart while it's visible.
  useEffect(() => {
    const node = buyBoxRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(Boolean(entry && !entry.isIntersecting)),
      { rootMargin: '0px 0px -80px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Publish the bar's real rendered height (incl. the safe-area padding) as a
  // CSS var so other fixed-bottom overlays (cookie consent, PWA install
  // prompt) can stack above it instead of covering the buy button — see
  // `--cta-bar-offset` in globals.css. Reset on hide/unmount so it doesn't
  // leak into pages without this bar.
  useEffect(() => {
    const height = showStickyBar ? (stickyBarRef.current?.offsetHeight ?? 0) : 0;
    document.documentElement.style.setProperty('--cta-bar-offset', `${height}px`);
    return () => {
      document.documentElement.style.setProperty('--cta-bar-offset', '0px');
    };
  }, [showStickyBar]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.sku === selectedSku) ?? null,
    [variants, selectedSku],
  );

  const maxQuantity =
    typeof selectedVariant?.stock === 'number' && selectedVariant.stock > 0
      ? selectedVariant.stock
      : 99;

  // Reset to 1 when switching variants so a leftover count can't exceed new stock.
  useEffect(() => {
    setQuantity(1);
  }, [selectedSku]);

  const previewGalleryIndex = hoverGalleryIndex ?? galleryIndex;

  const galleryImage: ImageType | null =
    product.images[Math.min(previewGalleryIndex, Math.max(product.images.length - 1, 0))] ??
    product.images[0] ??
    null;

  const displayedImage: ImageType | null =
    hoverGalleryIndex !== null || heroFromGallery || !selectedVariant?.image
      ? galleryImage
      : selectedVariant.image;
  const displayedPrice: number = selectedVariant?.price ?? basePrice;
  const displayedCompareAt: number | null = selectedVariant
    ? selectedVariant.compareAtPrice
    : baseCompareAtPrice;
  const discountPercent =
    displayedCompareAt && displayedCompareAt > displayedPrice
      ? Math.round(((displayedCompareAt - displayedPrice) / displayedCompareAt) * 100)
      : null;

  const cartSelection = {
    sku: selectedVariant?.sku ?? product.id,
    price: displayedPrice,
  };

  const showThumbs = product.images.length > 1;

  return (
    <>
    <article
      itemScope
      itemType="https://schema.org/Product"
      className="flex flex-col rounded-2xl border border-warm-200/80 bg-white shadow-soft-sm lg:flex-row lg:gap-8 dark:border-warm-800/40 dark:bg-warm-900"
    >
      <meta itemProp="sku" content={cartSelection.sku} />
      <meta itemProp="name" content={product.title} />
      <meta itemProp="description" content={product.description} />

      <div className="h-full w-full basis-full p-4 sm:p-6 lg:basis-4/6 lg:p-8">
        <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden rounded-xl bg-warm-100/50 dark:bg-warm-950" data-cart-fly-source>
          {displayedImage ? (
            <GalleryMediaViewer
              key={displayedImage.url}
              item={{
                ...displayedImage,
                altText: displayedImage.altText || product.title,
              }}
              priority
            />
          ) : null}
        </div>

        {showThumbs ? (
          <ul
            className="my-6 flex flex-wrap items-center justify-center gap-2 overflow-auto py-1 lg:mb-0"
            onMouseLeave={() => setHoverGalleryIndex(null)}
          >
            {product.images.map((image, index) => {
              const active = index === previewGalleryIndex;
              return (
                <li key={image.url + index} className="h-20 w-20">
                  <button
                    type="button"
                    aria-label={image.kind === 'video' ? t('viewVideoAria') : t('viewImageAria')}
                    aria-pressed={index === galleryIndex}
                    className="h-full w-full"
                    onMouseEnter={() => setHoverGalleryIndex(index)}
                    onFocus={() => setHoverGalleryIndex(index)}
                    onBlur={() => setHoverGalleryIndex(null)}
                    onClick={() => {
                      setGalleryIndex(index);
                      setHeroFromGallery(true);
                    }}
                  >
                    <GalleryMediaThumb
                      item={{
                        ...image,
                        altText: image.altText || product.title,
                      }}
                      active={active}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="basis-full border-t border-warm-200/60 p-4 sm:p-6 lg:border-l lg:border-t-0 lg:basis-2/6 lg:p-8 dark:border-warm-800/40">
        <div className="mb-7 flex flex-col border-b border-warm-200/40 pb-7 dark:border-warm-800/30">
          <h1 className="mb-3 font-display text-3xl font-bold leading-tight tracking-tight text-warm-900 sm:text-4xl dark:text-warm-100">
            {product.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-warm-900 px-4 py-2 text-lg font-bold text-warm-50 shadow-soft-sm dark:bg-warm-100 dark:text-warm-900">
              <Price amount={displayedPrice} currencyCode="VND" />
            </span>
            {displayedCompareAt && discountPercent ? (
              <>
                <Price
                  amount={displayedCompareAt}
                  currencyCode="VND"
                  className="text-base text-warm-400 line-through decoration-warm-300 dark:text-warm-500 dark:decoration-warm-600"
                />
                <span className="rounded-lg bg-terracotta-500 px-2.5 py-1 text-xs font-bold text-white dark:bg-terracotta-400 dark:text-warm-950">
                  -{discountPercent}%
                </span>
              </>
            ) : null}
          </div>
          {selectedVariant ? (
            <p className="mt-3 text-sm text-warm-500 dark:text-warm-400">
              {t('variantLabel')} <span className="font-medium text-warm-700 dark:text-warm-300">{selectedVariant.name}</span>
              <span className="mx-2 opacity-30">·</span>
              SKU: <span className="font-mono text-warm-600 dark:text-warm-400">{selectedVariant.sku}</span>
            </p>
          ) : null}
          <StockStatus
            inStock={selectedVariant ? selectedVariant.inStock : product.availableForSale}
            stock={selectedVariant ? selectedVariant.stock : null}
          />
        </div>

        {variants.length > 0 ? (
          <fieldset className="mb-7">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
              {t('variantLegend')}
            </legend>
            <ul className="flex flex-wrap gap-2">
              {variants.map((variant) => {
                const isActive = variant.sku === selectedSku;
                const disabled = !variant.inStock;
                return (
                  <li key={variant.sku}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      aria-label={t('variantSelectAria', { name: variant.name })}
                      disabled={disabled}
                      onClick={() => {
                        setSelectedSku(variant.sku);
                        setHeroFromGallery(false);
                      }}
                      className={clsx(
                        'rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 focus-visible:ring-offset-2',
                        isActive
                          ? 'border-warm-900 bg-warm-900 text-warm-50 shadow-soft-sm dark:border-warm-100 dark:bg-warm-100 dark:text-warm-900'
                          : 'border-warm-200/80 bg-white text-warm-700 hover:border-terracotta-300 hover:text-terracotta-700 dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:hover:border-terracotta-700 dark:hover:text-terracotta-400',
                        disabled && 'cursor-not-allowed opacity-40 hover:border-warm-200/80 dark:hover:border-warm-800/60',
                      )}
                    >
                      {variant.name}
                      {disabled ? <span className="ml-1 text-xs">({t('variantOutOfStock')})</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        {product.descriptionHtml ? (
          <Prose
            className="mb-7 text-sm leading-relaxed text-warm-600 dark:text-warm-400"
            html={product.descriptionHtml}
          />
        ) : null}

        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
            {t('quantityLabel')}
          </span>
          <div className="flex items-center rounded-xl border border-warm-200/80 dark:border-warm-800/60">
            <button
              type="button"
              aria-label={t('decreaseQtyAria')}
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center text-warm-700 transition-colors hover:text-terracotta-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-warm-300 dark:hover:text-terracotta-400"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="flex w-11 items-center justify-center text-sm font-medium tabular-nums text-warm-900 dark:text-warm-100">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={t('increaseQtyAria')}
              disabled={quantity >= maxQuantity}
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              className="flex h-11 w-11 items-center justify-center text-warm-700 transition-colors hover:text-terracotta-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-warm-300 dark:hover:text-terracotta-400"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={buyBoxRef} className="flex items-center gap-3">
          <div className="flex-1">
            <AddToCart
              product={product}
              variantSku={variants.length > 0 ? selectedSku : null}
              quantity={quantity}
              canAdd={
                variants.length === 0
                  ? product.availableForSale
                  : Boolean(selectedVariant?.inStock)
              }
              needsSelection={variants.length > 0 && !selectedVariant}
            />
          </div>
          <WishlistButton productId={product.id} productHandle={product.handle} variant="inline" />
        </div>

        <input type="hidden" name="selectedSku" value={cartSelection.sku} readOnly />
        <input
          type="hidden"
          name="selectedPrice"
          value={cartSelection.price}
          readOnly
        />
      </div>
    </article>

      {/* Mobile sticky add-to-cart bar — appears once the buy box scrolls away */}
      <div
        ref={stickyBarRef}
        aria-hidden={!showStickyBar}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-30 border-t border-warm-200/80 bg-warm-50/95 px-4 py-3 backdrop-blur-xl transition-transform duration-300 lg:hidden dark:border-warm-800/50 dark:bg-warm-950/95',
          'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          showStickyBar ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-warm-500 dark:text-warm-400">{product.title}</span>
            <span className="text-base font-bold text-warm-900 dark:text-warm-100">
              <Price amount={displayedPrice} currencyCode="VND" />
            </span>
          </div>
          <div className="ml-auto w-40 shrink-0">
            <AddToCart
              product={product}
              variantSku={variants.length > 0 ? selectedSku : null}
              quantity={quantity}
              canAdd={
                variants.length === 0
                  ? product.availableForSale
                  : Boolean(selectedVariant?.inStock)
              }
              needsSelection={variants.length > 0 && !selectedVariant}
            />
          </div>
        </div>
      </div>
    </>
  );
}

const LOW_STOCK_THRESHOLD = 5;

function StockStatus({
  inStock,
  stock,
}: {
  inStock: boolean;
  stock: number | null;
}): ReactElement {
  const t = useTranslations('product');
  if (!inStock) {
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-terracotta-600 dark:text-terracotta-400">
        <span className="h-2 w-2 rounded-full bg-terracotta-500" aria-hidden /> {t('stockOut')}
      </p>
    );
  }

  const low = typeof stock === 'number' && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  return (
    <p
      className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium ${
        low ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${low ? 'bg-amber-500' : 'bg-emerald-500'}`}
        aria-hidden
      />
      {low ? t('stockLow', { stock }) : t('stockIn')}
    </p>
  );
}