// components/product/variant-selector.tsx
'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useMemo, useState, type ReactElement } from 'react';
import AddToCart from '@/components/cart/add-to-cart';
import GridTileImage from '@/components/grid/tile';
import Price from '@/components/price';
import Prose from '@/components/prose';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
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

  const selectedVariant = useMemo(
    () => variants.find((v) => v.sku === selectedSku) ?? null,
    [variants, selectedSku],
  );

  const fallbackImage: ImageType | null =
    product.images[Math.min(galleryIndex, Math.max(product.images.length - 1, 0))] ??
    product.images[0] ??
    null;

  const displayedImage: ImageType | null = selectedVariant?.image ?? fallbackImage;
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

  const showThumbs = !selectedVariant && product.images.length > 1;

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
            <Image
              key={displayedImage.url}
              className="img-fit"
              fill
              sizes="(min-width: 1024px) 66vw, 100vw"
              alt={displayedImage.altText || product.title}
              src={toNextImageSrc(displayedImage.url)}
              priority
            />
          ) : null}
        </div>

        {showThumbs ? (
          <ul className="my-12 flex flex-wrap items-center justify-center gap-2 overflow-auto py-1 lg:mb-0">
            {product.images.map((image, index) => {
              const active = index === galleryIndex;
              return (
                <li key={image.url + index} className="h-20 w-20">
                  <button
                    type="button"
                    aria-label="Chọn ảnh sản phẩm"
                    aria-pressed={active}
                    className="h-full w-full"
                    onClick={() => setGalleryIndex(index)}
                  >
                    <GridTileImage
                      alt={image.altText || product.title}
                      src={image.url}
                      width={80}
                      height={80}
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
                      onClick={() =>
                        setSelectedSku((prev) => (prev === variant.sku ? null : variant.sku))
                      }
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

        <AddToCart product={product} />

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
