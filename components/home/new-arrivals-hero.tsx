// components/home/new-arrivals-hero.tsx — CMS-driven homepage hero with product carousel
import Link from 'next/link';
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

export default function NewArrivalsHero({ branding, products, categories }: Props): ReactElement | null {
  const { hero } = branding;

  if (!hero.enabled) {
    return null;
  }

  const slides = toHeroSlides(products);

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative border-b border-neutral-200 dark:border-neutral-800"
    >
      {hero.imageUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30"
          style={{ backgroundImage: `url(${hero.imageUrl})` }}
        />
      ) : null}

      <div className="relative mx-auto max-w-screen-2xl px-4 pb-6 pt-5 sm:pb-8 sm:pt-6">
        <div>
          {hero.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-filament-500 dark:text-filament-400">
              {hero.eyebrow}
            </p>
          ) : null}
          <h1
            id="home-hero-heading"
            className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {hero.title}
          </h1>
          {hero.subtitle ? (
            <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400 sm:text-base">
              {hero.subtitle}
            </p>
          ) : null}
          {hero.ctaLabel ? (
            <Link
              href={hero.ctaUrl}
              prefetch
              className="mt-4 inline-flex rounded-full bg-filament-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {hero.ctaLabel}
            </Link>
          ) : null}
        </div>

        {hero.showCarousel ? (
          <div className="mt-5 sm:mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-base font-bold tracking-tight sm:text-lg">{hero.carouselTitle}</h2>
              <Link
                href="/search"
                prefetch
                className="shrink-0 text-xs font-semibold text-filament-500 hover:underline sm:text-sm dark:text-filament-400"
              >
                View all
              </Link>
            </div>

            {slides.length > 0 ? (
              <ProductHeroCarousel slides={slides} autoPlayMs={4500} />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50 sm:aspect-[21/9]">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  New products will appear here
                </p>
                <Link
                  href="/search"
                  prefetch
                  className="mt-4 text-sm font-semibold text-filament-500 hover:underline dark:text-filament-400"
                >
                  Browse store
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {categories.length > 0 ? (
          <nav
            aria-label="Product categories"
            className="mt-5 flex gap-2 overflow-x-auto pb-1"
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/search/${category.slug}`}
                prefetch
                className="inline-flex shrink-0 items-center rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-filament-400 hover:text-filament-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-filament-500 dark:hover:text-filament-400 sm:text-sm"
              >
                {category.title}
              </Link>
            ))}
            <Link
              href="/search"
              prefetch
              className="inline-flex shrink-0 items-center rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-filament-400 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300 sm:text-sm"
            >
              All
            </Link>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
