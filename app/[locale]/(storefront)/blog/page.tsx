// app/(storefront)/blog/page.tsx — aggregate paginated listing of published posts (Content)
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import PostCard from '@/components/blog/post-card';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import Footer from '@/components/layout/footer';
import Pagination from '@/components/pagination';
import { getBlogCategories, getPublishedPosts } from '@/lib/blog';
import { getSiteName } from '@/lib/brand';
import { paginateList } from '@/lib/listing-pagination';
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  jsonLdToScriptString,
} from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

/** Upper bound on posts pulled for in-memory pagination — generous for blog scale. */
const MAX_LISTED_POSTS = 500;
/** Posts shown per listing page (3×3 grid). */
const POSTS_PER_PAGE = 9;

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription', { siteName }),
    alternates: { canonical: '/blog' },
    openGraph: {
      type: 'website',
      title: t('metaTitle'),
      description: t('metaDescription', { siteName }),
      url: absoluteUrl('/blog'),
      siteName,
    },
    twitter: { card: 'summary_large_image', title: t('metaTitle'), description: t('metaDescription', { siteName }) },
  };
}

export default async function BlogIndexPage({ params, searchParams }: Props): Promise<ReactElement> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const title = t('metaTitle');

  const [posts, categories, sp] = await Promise.all([
    getPublishedPosts(MAX_LISTED_POSTS),
    getBlogCategories(),
    searchParams,
  ]);

  const {
    page: pagePosts,
    currentPage,
    totalPages,
  } = paginateList(posts, sp.page, POSTS_PER_PAGE);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t('breadcrumbHome'), path: '/' },
    { name: title, path: '/blog' },
  ]);

  const description = t('metaDescription', { siteName });
  const itemListJsonLd = buildItemListJsonLd(
    pagePosts.map((post) => ({
      title: post.title,
      slug: post.slug,
      image: post.coverImageUrl,
    })),
    { name: title, description },
  );

  return (
    <>
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

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Breadcrumbs items={[{ name: t('breadcrumbHome'), href: '/' }, { name: title }]} />

        <header className="max-w-2xl">
          <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-3 text-lg text-warm-600 dark:text-warm-400">{description}</p>
        </header>

        {categories.length > 0 ? (
          <nav aria-label={t('categoriesAria')} className="mt-8 flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center rounded-lg border border-warm-900 bg-warm-900 px-3.5 text-sm font-medium text-warm-50 dark:border-warm-100 dark:bg-warm-100 dark:text-warm-900">
              {t('allLabel')}
            </span>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/blog/category/${category.slug}`}
                className="inline-flex h-9 items-center rounded-lg border border-warm-200/80 px-3.5 text-sm font-medium text-warm-600 transition-all duration-200 hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:border-warm-700 dark:hover:bg-warm-900 dark:hover:text-warm-200"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        ) : null}

        {pagePosts.length === 0 ? (
          <p className="py-16 text-center text-warm-500 dark:text-warm-400">
            {t('empty')}
          </p>
        ) : (
          <>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pagePosts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={index}
                  priority={index < 3}
                />
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} />
          </>
        )}
      </section>

      <Footer />
    </>
  );
}