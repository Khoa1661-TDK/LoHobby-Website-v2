// app/search/[collection]/page.tsx
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import CategoryBanner from '@/components/home/category-banner';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import Pagination from '@/components/pagination';
import ProductGrid from '@/components/product/product-grid';
import { getSiteName } from '@/lib/brand';
import { toStoreCategory } from '@/lib/categories';
import { defaultSort, sorting } from '@/lib/constants';
import { paginateList } from '@/lib/listing-pagination';
import { applyProductFilters, parseProductFilters } from '@/lib/product-filters';
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildItemListJsonLd,
  categoryCanonicalPath,
  jsonLdToScriptString,
} from '@/lib/seo';
import { getCollection, getCollectionProducts } from '@/lib/shopify';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

export const revalidate = 60;

type Params = Promise<{ locale: string; collection: string }>;
type SearchParams = Promise<Record<string, string | undefined>>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { locale, collection } = await props.params;
  const t = await getTranslations({ locale, namespace: 'search' });
  const data = await getCollection(collection);
  if (!data) return notFound();

  const title = data.seo.title || `${data.title} | ${siteName}`;
  const description =
    data.seo.description ||
    data.description ||
    t('metaDescriptionWithQuery', { query: data.title, storeName: siteName });
  const canonical = categoryCanonicalPath(data.handle);
  const seoImage = data.seoImage;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(canonical),
      siteName,
      ...(seoImage
        ? {
            images: [
              {
                url: seoImage.url,
                width: seoImage.width,
                height: seoImage.height,
                alt: seoImage.altText || data.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(seoImage ? { images: [seoImage.url] } : {}),
    },
  };
}

export default async function CategoryPage(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { locale, collection } = await props.params;
  const t = await getTranslations({ locale, namespace: 'search' });
  const data = await getCollection(collection);
  if (!data) return notFound();

  const sp = await props.searchParams;
  const sortOption = sorting.find((item) => item.slug === sp.sort) ?? defaultSort;

  const allProducts = await getCollectionProducts({
    collection,
    reverse: sortOption.reverse,
    sortKey: sortOption.sortKey,
  });

  const filters = parseProductFilters(sp);
  const filteredProducts = applyProductFilters(allProducts, filters);

  const { page: products, currentPage, totalPages } = paginateList(
    filteredProducts,
    sp.page,
  );

  const categoryMeta = toStoreCategory({
    handle: collection,
    title: data.title,
    description: data.description,
  });
  const featured = allProducts[0];
  const bannerImage =
    featured?.featuredImage.url ??
    (categoryMeta?.bannerSeed
      ? `https://picsum.photos/seed/${categoryMeta.bannerSeed}/1600/640`
      : undefined);

  const content = (data.content ?? null) as SerializedEditorState | null;
  const faq = data.faq ?? [];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t('breadcrumbHome'), path: '/' },
    { name: t('breadcrumbStore'), path: '/search' },
    { name: data.title, path: categoryCanonicalPath(data.handle) },
  ]);

  const itemListJsonLd = buildItemListJsonLd(
    products.slice(0, 24).map((p) => ({
      title: p.title,
      slug: p.handle,
      image: p.featuredImage.url,
      price: p.priceRange.minVariantPrice.amount,
      priceCurrency: p.priceRange.minVariantPrice.currencyCode,
      available: p.availableForSale,
    })),
    { name: data.title, description: data.description },
  );

  const faqJsonLd = buildFaqJsonLd(faq);

  return (
    <section className="pb-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(itemListJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(faqJsonLd) }}
        />
      ) : null}

      <Breadcrumbs
        items={[
          { name: t('breadcrumbHome'), href: '/' },
          { name: t('breadcrumbStore'), href: '/search' },
          { name: data.title },
        ]}
      />

      {categoryMeta && bannerImage && featured ? (
        <CategoryBanner
          category={categoryMeta}
          bannerImage={bannerImage}
          productCount={allProducts.length}
        />
      ) : (
        <header className="mb-6">
          <h1 className="font-serif text-2xl font-bold tracking-tight">{data.title}</h1>
          {data.description ? (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{data.description}</p>
          ) : null}
        </header>
      )}

      {content ? (
        <RichText
          data={content}
          className="prose prose-neutral mt-6 max-w-none dark:prose-invert"
        />
      ) : null}

      <h2 className="mt-8 mb-4 font-serif text-xl font-bold tracking-tight sm:text-2xl">
        {t('featuredProducts', { title: data.title })}
      </h2>
      {products.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">
          {allProducts.length === 0
            ? t('noProductsInCategory')
            : `${t('noFilterResults')} ${t('tryAdjustingFilter')}`}
        </p>
      ) : (
        <>
          <ProductGrid products={products} />
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </>
      )}

      {faq.length > 0 ? (
        <section className="mt-12" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="mb-4 font-serif text-xl font-bold tracking-tight sm:text-2xl"
          >
            {t('faqHeading', { title: data.title })}
          </h2>
          <dl className="space-y-4">
            {faq.map((item, index) => (
              <div
                key={`${index}-${item.question}`}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <dt>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.question}
                  </h3>
                </dt>
                <dd className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </section>
  );
}