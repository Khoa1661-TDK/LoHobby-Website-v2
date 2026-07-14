// components/blocks/Spotlight.tsx — server shell for the deal spotlight carousel.
// Each deal embeds a real product (image/price/sale discount derived from it) with
// editorial text fields acting as optional overrides, and gets its own live countdown.
// The server renders every deal as a fully-formed split-banner slide, then hands them
// to the client carousel (SpotlightCarousel) which owns rotation, arrows, and dots.
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import PriceTag from '@/components/price';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';
import { getPayloadProductsByIds } from '@/lib/payload-products';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { Product } from '@/lib/shopify/types';
import SpotlightCountdown from './Spotlight.client';
import SpotlightCarousel from './SpotlightCarousel.client';

type ProductRef = { id: string | number } | string | number | null;

type Deal = {
  product?: ProductRef;
  heading?: string | null;
  description?: string | null;
  priceNow?: string | null;
  priceWas?: string | null;
  discountLabel?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  targetDate?: string | null;
  expiredText?: string | null;
};

type Props = {
  eyebrow?: string | null;
  deals?: Deal[] | null;
  autoplay?: boolean | null;
  autoplaySeconds?: number | null;
} & BlockAppearance;

// Per-slide style tokens, computed once from the block appearance and shared by every deal.
type SlideStyles = {
  ctaClass: string;
  accentText: string;
  accentBg: string;
  placeholderBg: string;
};

function toId(ref: ProductRef): string {
  if (ref === null || ref === undefined) return '';
  return typeof ref === 'object' ? String(ref.id) : String(ref);
}

/** Best-effort numeric value from a resolved price. A product amount is already a plain
 *  number string; a manual override may carry currency symbols/thousands separators
 *  ("₫1,290,000", "1.290.000 VND"), so strip every non-digit before parsing. Returns null
 *  when nothing numeric remains — the badge then simply isn't computed for that deal. */
function parsePriceAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Build the split-banner markup for one deal. Mirrors the original single-product layout;
 *  the eyebrow is the block-level shared label, repeated above each deal's heading. */
function renderSlide(
  deal: Deal,
  product: Product | null,
  eyebrow: string | null | undefined,
  s: SlideStyles,
): ReactElement | null {
  const heading = deal.heading?.trim() || product?.title || null;
  const description = deal.description?.trim() || product?.description || null;
  const image = product
    ? { url: toNextImageSrc(product.featuredImage.url), alt: product.featuredImage.altText || product.title }
    : null;

  const money = product?.priceRange.minVariantPrice ?? null;
  const ctaHref = deal.ctaHref?.trim() || (product?.handle ? `/product/${product.handle}` : null);

  // The product's list ("was") price: the compare-at amount when it's on sale, otherwise the
  // plain amount. This is what auto-fills the struck-through price so the editor only has to
  // pick the product and type the discounted "now" price by hand.
  const listAmount = money ? money.compareAtAmount ?? money.amount : null;
  const hasPriceNowOverride = Boolean(deal.priceNow?.trim());
  const hasPriceWasOverride = Boolean(deal.priceWas?.trim());

  // "Now" price: an override string renders verbatim; otherwise format the product amount
  // with the same vi-VN/currency treatment as the rest of the storefront.
  const priceNowNode: ReactNode = hasPriceNowOverride ? (
    deal.priceNow
  ) : money ? (
    <PriceTag amount={money.amount} currencyCode={money.currencyCode} className="inline" />
  ) : null;

  // "Was" price: an explicit override always wins. Otherwise auto-fetch the product's list
  // price — but only show it when there's actually a discount to strike through: either the
  // editor typed a manual "now" price, or the product is genuinely on sale (compare-at above
  // the current amount). A full-price product with no manual deal price shows no "was", so we
  // never render a struck-through duplicate of the "now" price.
  const isOnSale = money?.compareAtAmount != null && Number(money.compareAtAmount) > Number(money.amount);
  const showAutoWas = Boolean(listAmount) && (hasPriceNowOverride || isOnSale);
  const priceWasNode: ReactNode = hasPriceWasOverride ? (
    deal.priceWas
  ) : showAutoWas && listAmount ? (
    <PriceTag amount={listAmount} currencyCode={money!.currencyCode} className="inline" />
  ) : null;

  // Discount badge: an explicit override always wins. Otherwise auto-compute it from the
  // resolved now-vs-was gap so a manual "now" on a full-price product still gets a "-X%"
  // badge — not just genuinely on-sale products. Amounts come from the product (numeric) or
  // a manual override string, so parse both leniently; only show a badge when "was" is above
  // "now" (a real discount), matching the struck-through "was" price's own visibility rule.
  const nowAmount = hasPriceNowOverride ? parsePriceAmount(deal.priceNow) : money ? Number(money.amount) : null;
  const wasAmount = hasPriceWasOverride
    ? parsePriceAmount(deal.priceWas)
    : showAutoWas && listAmount
      ? Number(listAmount)
      : null;
  const computedDiscount =
    nowAmount != null && wasAmount != null && wasAmount > nowAmount && wasAmount > 0
      ? Math.round(((wasAmount - nowAmount) / wasAmount) * 100)
      : null;
  const discountLabel = deal.discountLabel?.trim() || (computedDiscount ? `-${computedDiscount}%` : null);

  // Nothing meaningful to show without a product or an explicit heading — drop this slide.
  if (!heading && !priceNowNode) return null;

  return (
    <div className="flex flex-col gap-8 overflow-hidden md:flex-row md:items-center">
      <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-card ${s.placeholderBg} md:w-1/2`}>
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
          <span className={`absolute left-4 top-4 rounded-full ${s.accentBg} px-3 py-1 text-xs font-bold uppercase tracking-wide text-white`}>
            {discountLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col md:w-1/2">
        {eyebrow ? (
          <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.3em] ${s.accentText}`}>
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            {heading}
          </h2>
        ) : null}
        {description ? <p className="mt-3 max-w-prose text-sm opacity-70">{description}</p> : null}

        {priceNowNode ? (
          <div className="mt-5 flex items-baseline gap-3">
            <span className={`font-display text-3xl font-bold ${s.accentText}`}>{priceNowNode}</span>
            {priceWasNode ? (
              <span className="text-base line-through opacity-50">{priceWasNode}</span>
            ) : null}
          </div>
        ) : null}

        {deal.targetDate ? (
          <div className="mt-6">
            <SpotlightCountdown
              targetDate={deal.targetDate}
              expiredText={deal.expiredText ?? 'This deal has ended.'}
            />
          </div>
        ) : null}

        {ctaHref ? (
          <Link
            href={ctaHref}
            {...linkAttrs(ctaHref)}
            className={`mt-7 inline-flex items-center justify-center self-start rounded-full px-6 py-3 text-sm font-medium transition-colors ${s.ctaClass}`}
          >
            {deal.ctaLabel?.trim() || 'Grab the deal'}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function SpotlightBlock(props: Props): Promise<ReactElement | null> {
  const { eyebrow, deals, autoplay, autoplaySeconds } = props;
  const dealList = Array.isArray(deals) ? deals : [];

  // Resolve every deal's product in one batched query, then index by id.
  const ids = Array.from(new Set(dealList.map((d) => toId(d.product ?? null)).filter(Boolean)));
  const products = ids.length ? await getPayloadProductsByIds(ids) : [];
  const productById = new Map(products.map((p) => [String(p.id), p]));

  const { section, container, style } = blockAppearanceClasses(props);
  // Default (Theme/unset) renders the fixed dark deal banner from the mockup. It must
  // use FIXED colors, not the theme-relative --ink/--surface tokens: those swap in dark
  // mode (--ink becomes light, --surface becomes dark), which would flip the banner to a
  // light surface and make the text track the page body colour instead of contrasting
  // with the banner. warm-900/white are constant in both site themes, so the banner stays
  // dark with readable light text always. An explicit appearance background (light/dark/
  // custom) opts back into the themed surface from blockAppearanceClasses.
  const isDefaultBackground = !props.background || props.background === 'theme';
  const shellBg = isDefaultBackground ? 'bg-warm-900 text-white' : '';
  // The CTA must contrast with the shell. On the fixed dark banner use a fixed light fill
  // with dark text (a themed bg-surface button would go near-black in dark mode and
  // vanish); on a light override keep the brand-filled button.
  const styles: SlideStyles = {
    ctaClass: isDefaultBackground
      ? 'bg-white text-warm-900 hover:bg-white/90'
      : 'bg-filament-500 text-white hover:bg-filament-600',
    // Accent content (eyebrow/price/discount badge) must also stay stable on the fixed dark
    // banner. The themed --accent token swaps to the darker light-mode blue (#1f6feb, tuned
    // for white bgs) when the SITE is in light mode, which reads low-contrast on the
    // constantly-dark banner. Pin it to the dark-tuned accent (#5b96ff) here; opt back into
    // the themed --accent only on a light/custom appearance override.
    accentText: isDefaultBackground ? 'text-[#5b96ff]' : 'text-accent',
    accentBg: isDefaultBackground ? 'bg-[#5b96ff]' : 'bg-accent',
    // The image placeholder frame likewise can't use the themed --surface-raised (light gray
    // in light mode) behind a dark banner — use a subtle white wash.
    placeholderBg: isDefaultBackground ? 'bg-white/5' : 'bg-surface-raised',
  };

  // Build one slide per deal, dropping deals with nothing meaningful to show.
  const slides = dealList
    .map((deal) => renderSlide(deal, productById.get(toId(deal.product ?? null)) ?? null, eyebrow, styles))
    .filter((slide): slide is ReactElement => slide !== null);

  if (slides.length === 0) return null;

  return (
    <section className={`${shellBg} ${section}`.trim()} style={style}>
      <div className={container}>
        <SpotlightCarousel
          slides={slides}
          autoplay={autoplay !== false}
          autoplaySeconds={typeof autoplaySeconds === 'number' ? autoplaySeconds : 6}
          onDark={isDefaultBackground}
        />
      </div>
    </section>
  );
}
