// app/(storefront)/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import CategorySection from '@/components/home/category-section';
import NewArrivalsHero from '@/components/home/new-arrivals-hero';
import Footer from '@/components/layout/footer';
import { BRAND_DESCRIPTION, getSiteName } from '@/lib/brand';
import { groupProductsByCategory } from '@/lib/categories';
import { jsonLdToScriptString } from '@/lib/seo';
import { getProducts, getStoreCategories } from '@/lib/shopify';
import { baseUrl } from '@/lib/utils';

const siteName = getSiteName();

export const metadata: Metadata = {
  title: `${siteName} — Mô hình, móc khóa & hobby`,
  description: BRAND_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    title: siteName,
    description: BRAND_DESCRIPTION,
    url: baseUrl,
  },
};

export const revalidate = 60;

export default async function HomePage(): Promise<ReactElement> {
  const [categories, latestProducts] = await Promise.all([
    getStoreCategories(),
    getProducts({ sortKey: 'CREATED_AT', reverse: false }),
  ]);

  const heroProducts = latestProducts.slice(0, 8);
  const productsByCategory = groupProductsByCategory(latestProducts, categories);

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
    logo: `${baseUrl}/brand/lo-logo.png`,
    description: BRAND_DESCRIPTION,
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

      <NewArrivalsHero products={heroProducts} categories={categories} />

      {categories.map((category) => (
        <CategorySection
          key={category.slug}
          category={category}
          products={productsByCategory.get(category.slug) ?? []}
        />
      ))}

      <Footer />
    </>
  );
}
