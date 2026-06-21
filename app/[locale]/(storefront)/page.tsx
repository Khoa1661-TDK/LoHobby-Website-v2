// app/(storefront)/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import CategorySection from '@/components/home/category-section';
import NewArrivalsHero from '@/components/home/new-arrivals-hero';
import PersonalizedRecommendations from '@/components/home/personalized-recommendations';
import Footer from '@/components/layout/footer';
import RecentlyViewed from '@/components/product/recently-viewed';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import { getHomePage } from '@/lib/page-builder';
import { type Locale } from '@/i18n/routing';
import { getStoreBranding } from '@/lib/store-branding';
import { groupProductsByCategory } from '@/lib/categories';
import { jsonLdToScriptString } from '@/lib/seo';
import { getProducts, getStoreCategories } from '@/lib/shopify';
import { absoluteUrl, baseUrl } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getStoreBranding();
  return {
    title: branding.storeName,
    description: branding.description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      title: branding.storeName,
      description: branding.description,
      url: baseUrl,
    },
  };
}

export const revalidate = 60;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<ReactElement> {
  const { locale } = await params;
  // If a page with slug "home" exists for this locale, render it via the page builder.
  const homePage = await getHomePage(locale);
  if (homePage) {
    return (
      <article>
        <RenderBlocks blocks={homePage.layout} />
      </article>
    );
  }

  // Otherwise, keep existing homepage behaviour.
  const [categories, latestProducts, branding] = await Promise.all([
    getStoreCategories(),
    getProducts({ sortKey: 'CREATED_AT', reverse: false }),
    getStoreBranding(),
  ]);

  const heroProducts = latestProducts.slice(0, 8);
  const productsByCategory = groupProductsByCategory(latestProducts, categories);

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: branding.storeName,
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
    name: branding.storeName,
    url: baseUrl,
    logo: absoluteUrl(branding.logoUrl),
    description: branding.description,
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(organizationJsonLd) }}
      />

      <NewArrivalsHero branding={branding} products={heroProducts} categories={categories} />

      <PersonalizedRecommendations />

      {categories.map((category) => (
        <CategorySection
          key={category.slug}
          category={category}
          products={productsByCategory.get(category.slug) ?? []}
        />
      ))}

      <div className="mx-auto max-w-screen-2xl px-4">
        <RecentlyViewed />
      </div>

      <Footer />
    </>
  );
}
