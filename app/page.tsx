// app/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { Carousel } from '@/components/carousel';
import { ThreeItemGrid } from '@/components/grid/three-items';
import Footer from '@/components/layout/footer';
import { baseUrl } from '@/lib/utils';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'PolyToys';
const description =
  'Shop hand-printed 3D toys — articulated dragons, modular mechs, glow octopuses, and fidget gear spinners. Made to order in Vietnam, paid via VietQR.';

export const metadata: Metadata = {
  title: `${siteName} — Hand-printed 3D toys`,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: siteName,
    description,
    url: baseUrl,
  },
};

export const revalidate = 0;

export default function HomePage(): ReactElement {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: baseUrl,
    logo: `${baseUrl}/icon`,
    description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <section className="mx-auto max-w-screen-2xl px-4 pb-6 pt-8 md:flex md:items-end md:justify-between md:gap-8">
        <div>
          <span className="inline-flex items-center rounded-full bg-filament-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-filament-700 dark:bg-filament-900 dark:text-filament-200">
            Made to order in Vietnam
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Hand-printed plastic toys you can actually <span className="text-filament-500">pose, spin, and play with</span>.
          </h1>
        </div>
        <p className="mt-4 max-w-md text-base text-neutral-600 md:mt-0 dark:text-neutral-400">
          Articulated dragons, modular mechs, glow octopuses, RPG dice — sliced, printed, and
          shipped from our workshop. Pay via VietQR.
        </p>
      </section>
      <ThreeItemGrid />
      <Carousel />
      <Footer />
    </>
  );
}
