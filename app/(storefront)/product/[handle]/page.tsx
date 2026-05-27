// app/(storefront)/product/[handle]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense, type ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import GridTileImage from '@/components/grid/tile';
import Gallery from '@/components/product/gallery';
import ProductDescription from '@/components/product/product-description';
import { getSiteName } from '@/lib/brand';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import {
  getPayloadProductRecommendations,
  loadPayloadProductDoc,
  mapPayloadProductToCommerceProduct,
  resolveCategories,
} from '@/lib/payload-products';
import { buildProductJsonLd, productCanonicalPath, resolveSeoImage } from '@/lib/seo';
import type { Product } from '@/lib/shopify/types';
import { absoluteUrl, baseUrl } from '@/lib/utils';

const siteName = getSiteName();

export const dynamic = 'force-dynamic';

type Params = Promise<{ handle: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { handle } = await props.params;
  const doc = await loadPayloadProductDoc(handle);
  if (!doc) return {};

  const product = mapPayloadProductToCommerceProduct(doc);
  if (product.tags.includes(HIDDEN_PRODUCT_TAG)) return {};

  const meta = doc.meta ?? {};
  const title = meta.title?.trim() || product.title;
  const description = meta.description?.trim() || product.description;
  const seoImage = resolveSeoImage(meta, {
    url: product.featuredImage.url,
    alt: product.featuredImage.altText || product.title,
    width: product.featuredImage.width,
    height: product.featuredImage.height,
  });
  const indexable = product.availableForSale;
  const canonical = productCanonicalPath(product.handle);

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
        'max-image-preview': 'large',
      },
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
                alt: seoImage.alt || product.title,
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

export default async function ProductPage(props: { params: Params }): Promise<ReactElement> {
  const { handle } = await props.params;
  const doc = await loadPayloadProductDoc(handle);
  if (!doc) return notFound();

  const product = mapPayloadProductToCommerceProduct(doc);
  if (product.tags.includes(HIDDEN_PRODUCT_TAG)) {
    return notFound();
  }

  const categories = resolveCategories(doc.category);
  const canonical = absoluteUrl(productCanonicalPath(product.handle));

  const productJsonLd = buildProductJsonLd({
    title: product.title,
    description: product.description,
    slug: product.handle,
    price: doc.price,
    available: product.availableForSale,
    images: product.images.map((image) => image.url),
    sku: product.id,
  });

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Trang chủ',
      item: baseUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Cửa hàng',
      item: `${baseUrl}/search`,
    },
  ];

  if (categories[0]) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: categories[0].title,
      item: `${baseUrl}/search/${categories[0].slug}`,
    });
  }

  breadcrumbItems.push({
    '@type': 'ListItem',
    position: categories[0] ? 4 : 3,
    name: product.title,
    item: canonical,
  });

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="mx-auto max-w-(--breakpoint-2xl) px-4">
        <nav aria-label="Đường dẫn" className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:underline">
                Trang chủ
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/search" className="hover:underline">
                Cửa hàng
              </Link>
            </li>
            {categories[0] ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/search/${categories[0].slug}`} className="hover:underline">
                    {categories[0].title}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-black dark:text-white">
              {product.title}
            </li>
          </ol>
        </nav>

        {categories.length > 0 ? (
          <ul className="mb-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={String(category.id)}>
                <Link
                  href={`/search/${category.slug}`}
                  className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  {category.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <article
          itemScope
          itemType="https://schema.org/Product"
          className="flex flex-col rounded-lg border border-neutral-200 bg-white p-8 md:p-12 lg:flex-row lg:gap-8 dark:border-neutral-800 dark:bg-black"
        >
          <meta itemProp="sku" content={product.id} />
          <meta itemProp="name" content={product.title} />
          <meta itemProp="description" content={product.description} />
          <div className="h-full w-full basis-full lg:basis-4/6">
            <Suspense
              fallback={
                <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden" />
              }
            >
              <Gallery
                images={product.images.map((image) => ({
                  src: image.url,
                  altText: image.altText || product.title,
                }))}
              />
            </Suspense>
          </div>
          <div className="basis-full lg:basis-2/6">
            <ProductDescription product={product} />
          </div>
        </article>
        <RelatedProducts slug={product.handle} categoryIds={categories.map((c) => c.id)} />
      </div>
      <Footer />
    </>
  );
}

async function RelatedProducts({
  slug,
  categoryIds,
}: {
  slug: string;
  categoryIds: Array<string | number>;
}): Promise<ReactElement | null> {
  const related: Product[] = await getPayloadProductRecommendations(slug, categoryIds);
  if (related.length === 0) return null;

  return (
    <aside className="py-8" aria-label="Sản phẩm liên quan">
      <h2 className="mb-4 text-2xl font-bold">Sản phẩm liên quan</h2>
      <ul className="flex w-full gap-4 overflow-x-auto pt-1">
        {related.map((product) => (
          <li
            key={product.handle}
            className="aspect-square w-full flex-none min-[475px]:w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5"
          >
            <Link
              className="relative h-full w-full"
              href={`/product/${product.handle}`}
              prefetch
            >
              <GridTileImage
                alt={product.title}
                label={{
                  title: product.title,
                  amount: product.priceRange.maxVariantPrice.amount,
                  currencyCode: product.priceRange.maxVariantPrice.currencyCode,
                }}
                src={product.featuredImage.url}
                fill
                sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, (min-width: 475px) 50vw, 100vw"
              />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
