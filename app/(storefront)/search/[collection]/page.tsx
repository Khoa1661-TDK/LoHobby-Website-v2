// app/search/[collection]/page.tsx
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import CategoryBanner from '@/components/home/category-banner';
import ProductGrid from '@/components/product/product-grid';
import { getSiteName } from '@/lib/brand';
import { toStoreCategory } from '@/lib/categories';
import { defaultSort, sorting } from '@/lib/constants';
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

type Params = Promise<{ collection: string }>;
type SearchParams = Promise<{ sort?: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { collection } = await props.params;
  const data = await getCollection(collection);
  if (!data) return notFound();

  const title = data.seo.title || `${data.title} | ${siteName}`;
  const description =
    data.seo.description ||
    data.description ||
    `Mua ${data.title} in 3D theo yêu cầu tại ${siteName}. Nhựa PLA/PETG an toàn, in theo mẫu riêng, giao toàn quốc, thanh toán VietQR.`;
  const canonical = categoryCanonicalPath(data.handle);

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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CategoryPage(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { collection } = await props.params;
  const data = await getCollection(collection);
  if (!data) return notFound();

  const { sort } = await props.searchParams;
  const sortOption = sorting.find((item) => item.slug === sort) ?? defaultSort;

  const products = await getCollectionProducts({
    collection,
    reverse: sortOption.reverse,
    sortKey: sortOption.sortKey,
  });

  const categoryMeta = toStoreCategory({
    handle: collection,
    title: data.title,
    description: data.description,
  });
  const featured = products[0];
  const bannerImage =
    categoryMeta?.bannerSeed && featured
      ? `https://picsum.photos/seed/${categoryMeta.bannerSeed}/1600/640`
      : featured?.featuredImage.url;

  const content = (data.content ?? null) as SerializedEditorState | null;
  const faq = data.faq ?? [];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Trang chủ', path: '/' },
    { name: 'Cửa hàng', path: '/search' },
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

      {categoryMeta && bannerImage && featured ? (
        <CategoryBanner
          category={categoryMeta}
          bannerImage={bannerImage}
          productCount={products.length}
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
        Sản phẩm {data.title} nổi bật
      </h2>
      {products.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">Chưa có sản phẩm trong danh mục này.</p>
      ) : (
        <ProductGrid products={products} />
      )}

      {faq.length > 0 ? (
        <section className="mt-12" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="mb-4 font-serif text-xl font-bold tracking-tight sm:text-2xl"
          >
            Câu hỏi thường gặp về {data.title}
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
