// components/blocks/Spotlight.tsx — server shell for the deal spotlight banner:
// a split layout that embeds a real product. The product drives the image, price,
// and sale discount; editorial text fields (eyebrow/heading/description) and the
// price/discount/href fields act as optional overrides. An optional live countdown
// ticks in the client island; everything else is server-rendered.
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import PriceTag from '@/components/price';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';
import { getDiscountPercent } from '@/lib/categories';
import { getPayloadProductsByIds } from '@/lib/payload-products';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { Product } from '@/lib/shopify/types';
import SpotlightCountdown from './Spotlight.client';

type ProductRef = { id: string | number } | string | number | null;

type Props = {
  product?: ProductRef;
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  priceNow?: string | null;
  priceWas?: string | null;
  discountLabel?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  targetDate?: string | null;
  expiredText?: string | null;
} & BlockAppearance;

function toId(ref: ProductRef): string {
  if (ref === null || ref === undefined) return '';
  return typeof ref === 'object' ? String(ref.id) : String(ref);
}

async function resolveProduct(ref: ProductRef): Promise<Product | null> {
  const id = toId(ref);
  if (!id) return null;
  const [product] = await getPayloadProductsByIds([id]);
  return product ?? null;
}

export default async function SpotlightBlock(props: Props): Promise<ReactElement | null> {
  const {
    product: productRef,
    eyebrow,
    heading: headingOverride,
    description: descriptionOverride,
    priceNow: priceNowOverride,
    priceWas: priceWasOverride,
    discountLabel: discountOverride,
    ctaLabel,
    ctaHref: ctaHrefOverride,
    targetDate,
    expiredText,
  } = props;

  const product = await resolveProduct(productRef ?? null);

  // Derive display values from the product, letting explicit text overrides win.
  const heading = headingOverride?.trim() || product?.title || null;
  const description = descriptionOverride?.trim() || product?.description || null;
  const image = product
    ? { url: toNextImageSrc(product.featuredImage.url), alt: product.featuredImage.altText || product.title }
    : null;

  const money = product?.priceRange.minVariantPrice ?? null;
  const derivedDiscount = product ? getDiscountPercent(product) : null;
  const discountLabel = discountOverride?.trim() || (derivedDiscount ? `-${derivedDiscount}%` : null);
  const ctaHref =
    ctaHrefOverride?.trim() || (product?.handle ? `/product/${product.handle}` : null);

  // Price nodes: an override string renders verbatim; otherwise format the product
  // amount with the same vi-VN/currency treatment as the rest of the storefront.
  const priceNowNode: ReactNode = priceNowOverride?.trim() ? (
    priceNowOverride
  ) : money ? (
    <PriceTag amount={money.amount} currencyCode={money.currencyCode} className="inline" />
  ) : null;

  const priceWasNode: ReactNode = priceWasOverride?.trim() ? (
    priceWasOverride
  ) : money?.compareAtAmount ? (
    <PriceTag amount={money.compareAtAmount} currencyCode={money.currencyCode} className="inline" />
  ) : null;

  // Nothing meaningful to show without a product or an explicit heading.
  if (!heading && !priceNowNode) return null;

  const { section, container, style } = blockAppearanceClasses(props);
  // Default (Theme/unset) renders the fixed dark deal banner from the mockup. It
  // must use FIXED colors, not the theme-relative --ink/--surface tokens: those
  // swap in dark mode (--ink becomes light, --surface becomes dark), which would
  // flip the banner to a light surface and make the text track the page body
  // colour instead of contrasting with the banner. warm-900/white are constant in
  // both site themes, so the banner stays dark with readable light text always.
  // An explicit appearance background (light/dark/custom) opts back into the
  // themed surface from blockAppearanceClasses.
  const isDefaultBackground = !props.background || props.background === 'theme';
  const shellBg = isDefaultBackground ? 'bg-warm-900 text-white' : '';
  // The CTA must contrast with the shell. On the fixed dark banner use a fixed
  // light fill with dark text (a themed bg-surface button would go near-black in
  // dark mode and vanish); on a light override keep the brand-filled button.
  const ctaClass = isDefaultBackground
    ? 'bg-white text-warm-900 hover:bg-white/90'
    : 'bg-filament-500 text-white hover:bg-filament-600';
  // Accent content (eyebrow/price/discount badge) must also stay stable on the
  // fixed dark banner. The themed --accent token swaps to the darker light-mode
  // blue (#1f6feb, tuned for white bgs) when the SITE is in light mode, which
  // reads low-contrast on the constantly-dark banner. Pin it to the dark-tuned
  // accent (#5b96ff) here; opt back into the themed --accent only on a
  // light/custom appearance override.
  const accentText = isDefaultBackground ? 'text-[#5b96ff]' : 'text-accent';
  const accentBg = isDefaultBackground ? 'bg-[#5b96ff]' : 'bg-accent';
  // The image placeholder frame likewise can't use the themed --surface-raised
  // (light gray in light mode) behind a dark banner — use a subtle white wash.
  const placeholderBg = isDefaultBackground ? 'bg-white/5' : 'bg-surface-raised';

  return (
    <section className={`${shellBg} ${section}`.trim()} style={style}>
      <div className={container}>
        <div className="flex flex-col gap-8 overflow-hidden md:flex-row md:items-center">
          <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-card ${placeholderBg} md:w-1/2`}>
            {image?.url ? (
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : null}
            {discountLabel ? (
              <span className={`absolute left-4 top-4 rounded-full ${accentBg} px-3 py-1 text-xs font-bold uppercase tracking-wide text-white`}>
                {discountLabel}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col md:w-1/2">
            {eyebrow ? (
              <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.3em] ${accentText}`}>
                {eyebrow}
              </p>
            ) : null}
            {heading ? (
              <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                {heading}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-3 max-w-prose text-sm opacity-70">{description}</p>
            ) : null}

            {priceNowNode ? (
              <div className="mt-5 flex items-baseline gap-3">
                <span className={`font-display text-3xl font-bold ${accentText}`}>{priceNowNode}</span>
                {priceWasNode ? (
                  <span className="text-base line-through opacity-50">{priceWasNode}</span>
                ) : null}
              </div>
            ) : null}

            {targetDate ? (
              <div className="mt-6">
                <SpotlightCountdown
                  targetDate={targetDate}
                  expiredText={expiredText ?? 'This deal has ended.'}
                />
              </div>
            ) : null}

            {ctaHref ? (
              <Link
                href={ctaHref}
                {...linkAttrs(ctaHref)}
                className={`mt-7 inline-flex items-center justify-center self-start rounded-full px-6 py-3 text-sm font-medium transition-colors ${ctaClass}`}
              >
                {ctaLabel?.trim() || 'Grab the deal'}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
