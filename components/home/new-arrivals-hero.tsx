// components/home/new-arrivals-hero.tsx — CMS-driven homepage hero with product carousel
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import ProductHeroCarousel, { type HeroSlide } from '@/components/home/product-hero-carousel';
import type { StoreBranding } from '@/lib/store-branding';
import type { StoreCategory } from '@/lib/categories';
import type { Product } from '@/lib/shopify/types';

type Props = {
  branding: StoreBranding;
  products: Product[];
  categories: StoreCategory[];
};

function toHeroSlides(products: Product[]): HeroSlide[] {
  return products
    .filter((product) => product.featuredImage?.url)
    .map((product) => {
      const image = product.featuredImage;
      return {
        handle: product.handle,
        title: product.title,
        imageUrl: image.url,
        imageAlt: image.altText || product.title,
      };
    });
}

export default async function NewArrivalsHero({ branding, products, categories }: Props): Promise<ReactElement | null> {
  const t = await getTranslations('home');
  const { hero } = branding;

  if (!hero.enabled) {
    return null as unknown as ReactElement | null;
  }

  const slides = toHeroSlides(products);

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden border-b border-warm-200/60 dark:border-warm-800/30"
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-warm-100/80 via-transparent to-transparent dark:from-warm-900/40 dark:via-transparent dark:to-transparent" />
        {hero.imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.06] dark:opacity-[0.08]"
            style={{ backgroundImage: `url(${hero.imageUrl})` }}
          />
        ) : null}
      </div>

      <div className="relative mx-auto max-w-screen-2xl px-4 pb-8 pt-6 sm:pb-10 sm:pt-8 lg:px-6">
        {/* Editorial header */}
        <div className="animate-reveal-up" style={{ animationDelay: '0ms' }}>
          {hero.eyebrow ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-terracotta-500 dark:text-terracotta-400">
              <span className="h-px w-8 bg-terracotta-300 dark:bg-terracotta-700" />
              {hero.eyebrow}
            </span>
          ) : null}

          <h1
            id="home-hero-heading"
            className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-warm-900 text-balance sm:text-4xl lg:text-5xl dark:text-warm-100"
          >
            {hero.title}
          </h1>

          {hero.subtitle ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-warm-600 sm:text-lg dark:text-warm-400">
              {hero.subtitle}
            </p>
          ) : null}

          {hero.ctaLabel ? (
            <div className="mt-5 flex items-center gap-4">
              <Link
                href={hero.ctaUrl}
                prefetch
                className="inline-flex items-center gap-2 rounded-xl bg-warm-900 px-6 py-3 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-300 hover:bg-warm-800 hover:shadow-soft-lg hover:-translate-y-px active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
              >
                {hero.ctaLabel}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/search"
                prefetch
                className="text-sm font-medium text-warm-500 transition-colors duration-200 hover:text-warm-800 dark:text-warm-400 dark:hover:text-warm-200"
              >
                {t('heroViewAll')} →
              </Link>
            </div>
          ) : null}
        </div>

        {/* Carousel section */}
        {hero.showCarousel ? (
          <div
            className="mt-7 animate-reveal-up sm:mt-9"
            style={{ animationDelay: '150ms' }}
          >
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-warm-800 sm:text-xl dark:text-warm-200">
                  {hero.carouselTitle}
                </h2>
                <p className="mt-0.5 text-sm text-warm-500 dark:text-warm-400">
                  {t('heroCarouselSubtitle')}
                </p>
              </div>
              <Link
                href="/search"
                prefetch
                className="shrink-0 text-sm font-medium text-terracotta-600 transition-colors hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
              >
                {t('heroViewAll')} →
              </Link>
            </div>

            {slides.length > 0 ? (
              <ProductHeroCarousel slides={slides} autoPlayMs={4500} />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-warm-200/80 bg-warm-100/50 p-8 text-center dark:border-warm-800/40 dark:bg-warm-900/50 sm:aspect-[21/9]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-warm-200/50 dark:bg-warm-800/50">
                  <svg className="h-6 w-6 text-warm-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-warm-600 dark:text-warm-400">
                  {t('heroEmptyTitle')}
                </p>
                <Link
                  href="/search"
                  prefetch
                  className="mt-4 text-sm font-semibold text-terracotta-600 transition-colors hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
                >
                  {t('heroEmptyCta')} →
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {/* Category pills */}
        {categories.length > 0 ? (
          <nav
            aria-label={t('heroCategoriesAria')}
            className="mt-7 flex animate-reveal-up flex-wrap gap-2"
            style={{ animationDelay: '300ms' }}
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/search/${category.slug}`}
                prefetch
                className="inline-flex shrink-0 items-center rounded-xl border border-warm-200/80 bg-white px-4 py-2 text-sm font-medium text-warm-700 shadow-soft-sm transition-all duration-200 hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-700 hover:shadow-soft-md dark:border-warm-800/60 dark:bg-warm-900 dark:text-warm-300 dark:hover:border-terracotta-700 dark:hover:bg-terracotta-950/50 dark:hover:text-terracotta-300"
              >
                {category.title}
              </Link>
            ))}
            <Link
              href="/search"
              prefetch
              className="inline-flex shrink-0 items-center rounded-xl border border-dashed border-warm-300/80 bg-warm-100/50 px-4 py-2 text-sm font-medium text-warm-600 transition-all duration-200 hover:border-warm-400 hover:bg-warm-100 dark:border-warm-700/60 dark:bg-warm-900/50 dark:text-warm-400 dark:hover:border-warm-600 dark:hover:bg-warm-900"
            >
              {t('heroAllCategories')}
            </Link>
          </nav>
        ) : null}
      </div>
    </section>
  );
}