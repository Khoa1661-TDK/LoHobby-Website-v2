// components/home/new-arrivals-hero.tsx — homepage hero with product carousel
import Link from 'next/link';
import type { ReactElement } from 'react';
import ProductHeroCarousel, { type HeroSlide } from '@/components/home/product-hero-carousel';
import { BRAND_TAGLINE, getSiteName } from '@/lib/brand';
import { getCategoryIcon, type StoreCategory } from '@/lib/categories';
import type { Product } from '@/lib/shopify/types';

type Props = {
  products: Product[];
  categories: StoreCategory[];
};

function toHeroSlides(products: Product[]): HeroSlide[] {
  return products.map((product) => {
    const image = product.featuredImage;

    return {
      handle: product.handle,
      title: product.title,
      imageUrl: image.url,
      imageAlt: image.altText || product.title,
    };
  });
}

export default function NewArrivalsHero({ products, categories }: Props): ReactElement {
  const siteName = getSiteName();
  const slides = toHeroSlides(products);

  return (
    <section aria-labelledby="home-hero-heading" className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-screen-2xl px-4 pb-6 pt-5 sm:pb-8 sm:pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600 dark:text-red-400">
            In 3D · Sưu tầm · Giao toàn quốc
          </p>
          <h1
            id="home-hero-heading"
            className="mt-2 font-serif text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {siteName}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400 sm:text-base">
            {BRAND_TAGLINE}. Thanh toán VietQR.
          </p>
        </div>

        <div className="mt-5 sm:mt-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Hàng mới về</h2>
            <Link
              href="/search"
              prefetch
              className="shrink-0 text-xs font-semibold text-red-600 hover:underline sm:text-sm dark:text-red-400"
            >
              Xem tất cả
            </Link>
          </div>

          {slides.length > 0 ? (
            <ProductHeroCarousel slides={slides} />
          ) : (
            <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50 sm:aspect-[21/9]">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Sản phẩm mới sẽ xuất hiện tại đây
              </p>
              <Link
                href="/search"
                prefetch
                className="mt-4 text-sm font-semibold text-red-600 hover:underline dark:text-red-400"
              >
                Duyệt cửa hàng
              </Link>
            </div>
          )}
        </div>

        {categories.length > 0 ? (
          <nav
            aria-label="Danh mục sản phẩm"
            className="mt-5 flex gap-2 overflow-x-auto pb-1"
          >
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/search/${category.slug}`}
                prefetch
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-red-400 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-red-500 dark:hover:text-red-400 sm:text-sm"
              >
                <span aria-hidden="true">{getCategoryIcon(category.slug)}</span>
                {category.title}
              </Link>
            ))}
            <Link
              href="/search"
              prefetch
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-red-400 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300 sm:text-sm"
            >
              <span aria-hidden="true">🛍️</span>
              Tất cả
            </Link>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
