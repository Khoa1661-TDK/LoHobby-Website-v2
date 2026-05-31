// components/product/variant-selector.tsx
'use client';

import clsx from 'clsx';
import { useMemo, useState, type ReactElement } from 'react';
import AddToCart from '@/components/cart/add-to-cart';
import { GalleryMediaThumb, GalleryMediaViewer } from '@/components/product/gallery-media';
import Price from '@/components/price';
import Prose from '@/components/prose';
import WishlistButton from '@/components/wishlist/wishlist-button';
import type { StorefrontVariant } from '@/lib/payload-products';
import type { Image as ImageType, Product } from '@/lib/shopify/types';

type Props = {
  product: Product;
  /** Whole VND integer the customer pays when no variant overrides the price (sale price applied). */
  basePrice: number;
  /** Original whole-VND price to strike through when on sale, else null. */
  baseCompareAtPrice?: number | null;
  /** Inline product variants resolved from Payload (depth >= 2). */
  variants: StorefrontVariant[];
};

/**
 * Interactive product detail surface.
 *
 * Owns the selected variant state (sku + raw VND `price`) so it is ready to be
 * passed to an "Add to Cart" call as whole-VND integers — no formatting,
 * no minor units. When no variant is selected the base product details
 * (price + featured image) render by default.
 */
export default function VariantSelector({
  product,
  basePrice,
  baseCompareAtPrice = null,
  variants,
}: Props): ReactElement {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [hoverGalleryIndex, setHoverGalleryIndex] = useState<number | null>(null);
  /** When false and a variant has an image, the hero shows the variant photo. */
  const [heroFromGallery, setHeroFromGallery] = useState(false);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.sku === selectedSku) ?? null,
    [variants, selectedSku],
  );

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

  // Whole-VND payload that an Add to Cart handler can consume directly.
  const cartSelection = {
    sku: selectedVariant?.sku ?? product.id,
    price: displayedPrice,
  };

  const showThumbs = product.images.length > 1;

  return (
    <article
      itemScope
      itemType="https://schema.org/Product"
      className="flex flex-col rounded-lg border border-neutral-200 bg-white p-8 md:p-12 lg:flex-row lg:gap-8 dark:border-neutral-800 dark:bg-black"
    >
      <meta itemProp="sku" content={cartSelection.sku} />
      <meta itemProp="name" content={product.title} />
      <meta itemProp="description" content={product.description} />

      <div className="h-full w-full basis-full lg:basis-4/6">
        <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden">
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
            className="my-12 flex flex-wrap items-center justify-center gap-2 overflow-auto py-1 lg:mb-0"
            onMouseLeave={() => setHoverGalleryIndex(null)}
          >
            {product.images.map((image, index) => {
              const active = index === previewGalleryIndex;
              return (
                <li key={image.url + index} className="h-20 w-20">
                  <button
                    type="button"
                    aria-label={
                      image.kind === 'video' ? 'Xem video sản phẩm' : 'Xem ảnh sản phẩm'
                    }
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

      <div className="basis-full lg:basis-2/6">
        <div className="mb-6 flex flex-col border-b pb-6 dark:border-neutral-700">
          <h1 className="mb-2 text-5xl font-medium">{product.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-auto rounded-full bg-filament-500 p-2 text-sm text-white shadow-sm">
              <Price amount={displayedPrice} currencyCode="VND" />
            </div>
            {displayedCompareAt && discountPercent ? (
              <>
                <Price
                  amount={displayedCompareAt}
                  currencyCode="VND"
                  className="text-base text-neutral-400 line-through dark:text-neutral-500"
                />
                <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                  -{discountPercent}%
                </span>
              </>
            ) : null}
          </div>
          {selectedVariant ? (
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Phiên bản: <span className="font-medium">{selectedVariant.name}</span>
              <span className="mx-2 opacity-50">·</span>
              SKU: <span className="font-mono">{selectedVariant.sku}</span>
            </p>
          ) : null}
          <StockStatus
            inStock={selectedVariant ? selectedVariant.inStock : product.availableForSale}
            stock={selectedVariant ? selectedVariant.stock : null}
          />
        </div>

        {variants.length > 0 ? (
          <fieldset className="mb-6">
            <legend className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
              Phiên bản
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
                      aria-label={`Chọn phiên bản ${variant.name}`}
                      disabled={disabled}
                      onClick={() => {
                        setSelectedSku((prev) => {
                          const next = prev === variant.sku ? null : variant.sku;
                          if (next !== null) setHeroFromGallery(false);
                          return next;
                        });
                      }}
                      className={clsx(
                        'rounded-full border px-4 py-1.5 text-sm transition',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-filament-500 focus-visible:ring-offset-2',
                        isActive
                          ? 'border-filament-500 bg-filament-500 text-white shadow-sm'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100',
                        disabled && 'cursor-not-allowed opacity-50 hover:border-neutral-300',
                      )}
                    >
                      {variant.name}
                      {disabled ? <span className="ml-1 text-xs">(hết)</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        {product.descriptionHtml ? (
          <Prose
            className="mb-6 text-sm leading-tight dark:text-white/[60%]"
            html={product.descriptionHtml}
          />
        ) : null}

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <AddToCart
              product={product}
              variantSku={variants.length > 0 ? selectedSku : null}
              canAdd={
                variants.length === 0
                  ? product.availableForSale
                  : Boolean(selectedVariant?.inStock)
              }
            />
          </div>
          <WishlistButton productId={product.id} productHandle={product.handle} variant="inline" />
        </div>

        {/*
          Cart-ready selection state. Kept as raw VND integers so a future
          variant-aware addToCart server action can consume `selectedSku` /
          `selectedPrice` straight off the form without parsing.
        */}
        <input type="hidden" name="selectedSku" value={cartSelection.sku} readOnly />
        <input
          type="hidden"
          name="selectedPrice"
          value={cartSelection.price}
          readOnly
        />
      </div>
    </article>
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
  if (!inStock) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">
        <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden /> Hết hàng
      </p>
    );
  }

  const low = typeof stock === 'number' && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  return (
    <p
      className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${
        low ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${low ? 'bg-amber-500' : 'bg-emerald-500'}`}
        aria-hidden
      />
      {low ? `Sắp hết hàng (còn ${stock})` : 'Còn hàng'}
    </p>
  );
}
