// app/product/[handle]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense, type ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import GridTileImage from '@/components/grid/tile';
import Gallery from '@/components/product/gallery';
import ProductDescription from '@/components/product/product-description';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import { getProduct, getProductRecommendations } from '@/lib/shopify';
import type { Product } from '@/lib/shopify/types';
import { absoluteUrl, baseUrl } from '@/lib/utils';

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Local Store';

export const dynamic = 'force-dynamic';

type Params = Promise<{ handle: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { handle } = await props.params;
  const product = await getProduct(handle);
  if (!product) return {};

  const { url, width, height, altText: alt } = product.featuredImage;
  const indexable = !product.tags.includes(HIDDEN_PRODUCT_TAG);
  const title = product.seo.title || product.title;
  const description = product.seo.description || product.description;

  return {
    title,
    description,
    keywords: [...product.tags, product.title, siteName],
    alternates: { canonical: `/product/${product.handle}` },
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
      url: absoluteUrl(`/product/${product.handle}`),
      siteName,
      ...(url
        ? { images: [{ url, width, height, alt: alt || product.title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(url ? { images: [url] } : {}),
    },
  };
}

export default async function ProductPage(props: { params: Params }): Promise<ReactElement> {
  const { handle } = await props.params;
  const product = await getProduct(handle);
  if (!product) return notFound();

  const canonical = absoluteUrl(`/product/${product.handle}`);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': canonical,
    name: product.title,
    description: product.description,
    image: product.images.map((image) => image.url),
    sku: product.id,
    url: canonical,
    brand: { '@type': 'Brand', name: siteName },
    offers: {
      '@type': 'AggregateOffer',
      availability: product.availableForSale
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      priceCurrency: product.priceRange.minVariantPrice.currencyCode,
      highPrice: product.priceRange.maxVariantPrice.amount,
      lowPrice: product.priceRange.minVariantPrice.amount,
      offerCount: product.variants.length || 1,
      url: canonical,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: `${baseUrl}/search`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: canonical,
      },
    ],
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
        <nav aria-label="Breadcrumb" className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/search" className="hover:underline">
                Shop
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-black dark:text-white">
              {product.title}
            </li>
          </ol>
        </nav>
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
        <RelatedProducts id={product.id} />
      </div>
      <Footer />
    </>
  );
}

async function RelatedProducts({ id }: { id: string }): Promise<ReactElement | null> {
  const related: Product[] = await getProductRecommendations(id);
  if (related.length === 0) return null;

  return (
    <aside className="py-8" aria-label="Related products">
      <h2 className="mb-4 text-2xl font-bold">Related Products</h2>
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
