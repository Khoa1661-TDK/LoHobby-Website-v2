// app/(storefront)/blog/category/[slug]/page.tsx — posts scoped to one category slug (Content)
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import PostCard from '@/components/blog/post-card';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import Footer from '@/components/layout/footer';
import Pagination from '@/components/pagination';
import { getBlogCategories, getPublishedPosts, type BlogCategorySummary } from '@/lib/blog';
import { getSiteName } from '@/lib/brand';
import { paginateList } from '@/lib/listing-pagination';
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  jsonLdToScriptString,
} from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

/** Upper bound on posts pulled for in-memory filtering + pagination. */
const MAX_LISTED_POSTS = 500;
/** Posts shown per listing page (3×3 grid). */
const POSTS_PER_PAGE = 9;

export const revalidate = 60;

type Params = Promise<{ locale: string; slug: string }>;
type SearchParams = Promise<Record<string, string | undefined>>;

async function findCategory(slug: string): Promise<BlogCategorySummary | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  const categories = await getBlogCategories();
  return categories.find((category) => category.slug === trimmed) ?? null;
}

export async function generateMetadata(props: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const category = await findCategory(slug);
  if (!category) return { title: 'Không tìm thấy chủ đề' };

  const canonical = `/blog/category/${category.slug}`;
  const description =
    category.description ?? `Các bài viết thuộc chủ đề ${category.name} trên blog ${siteName}.`;

  return {
    title: `Blog · ${category.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: `Blog · ${category.name}`,
      description,
      url: absoluteUrl(canonical),
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Blog · ${category.name}`,
      description,
    },
  };
}

export default async function BlogCategoryPage(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const category = await findCategory(slug);
  if (!category) notFound();

  const [allPosts, sp] = await Promise.all([
    getPublishedPosts(MAX_LISTED_POSTS),
    props.searchParams,
  ]);

  const scopedPosts = allPosts.filter((post) => post.category?.slug === category.slug);

  const {
    page: pagePosts,
    currentPage,
    totalPages,
  } = paginateList(scopedPosts, sp.page, POSTS_PER_PAGE);

  const canonical = `/blog/category/${category.slug}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t('breadcrumbHome'), path: '/' },
    { name: t('breadcrumbBlog'), path: '/blog' },
    { name: category.name, path: canonical },
  ]);

  const itemListJsonLd = buildItemListJsonLd(
    pagePosts.map((post) => ({
      title: post.title,
      slug: post.slug,
      image: post.coverImageUrl,
    })),
    { name: category.name, description: category.description ?? undefined },
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
        <Breadcrumbs
          items={[
            { name: t('breadcrumbHome'), href: '/' },
            { name: t('breadcrumbBlog'), href: '/blog' },
            { name: category.name },
          ]}
        />

        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-terracotta-600 dark:text-terracotta-400">
            {t('categoriesAria')}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight md:text-4xl">
            {category.name}
          </h1>
          {category.description ? (
            <p className="mt-3 text-lg text-warm-600 dark:text-warm-400">{category.description}</p>
          ) : null}
        </header>

        {pagePosts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-warm-500 dark:text-warm-400">
              {t('empty')}
            </p>
            <Link
              href="/blog"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600 transition-colors hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
            >
              ← {t('allLabel')}
            </Link>
          </div>
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