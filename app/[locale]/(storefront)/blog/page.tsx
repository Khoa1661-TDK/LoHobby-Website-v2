// app/(storefront)/blog/page.tsx — aggregate paginated listing of published posts (Content)
import type { Metadata } from 'next';
import Link from 'next/link';
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

const title = 'Blog';
const description = `Tin tức, hướng dẫn và câu chuyện in 3D từ ${siteName}. Mẹo chăm sóc mô hình, vật liệu PLA/PETG và cảm hứng sáng tạo.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title,
    description,
    url: absoluteUrl('/blog'),
    siteName,
  },
  twitter: { card: 'summary_large_image', title, description },
};

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function BlogIndexPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const [posts, categories, searchParams] = await Promise.all([
    getPublishedPosts(MAX_LISTED_POSTS),
    getBlogCategories(),
    props.searchParams,
  ]);

  const {
    page: pagePosts,
    currentPage,
    totalPages,
  } = paginateList(posts, searchParams.page, POSTS_PER_PAGE);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Trang chủ', path: '/' },
    { name: title, path: '/blog' },
  ]);

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
        <Breadcrumbs items={[{ name: 'Trang chủ', href: '/' }, { name: title }]} />

        <header className="max-w-2xl">
          <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-3 text-lg text-warm-600 dark:text-warm-400">{description}</p>
        </header>

        {categories.length > 0 ? (
          <nav aria-label="Chủ đề" className="mt-8 flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center rounded-lg border border-warm-900 bg-warm-900 px-3.5 text-sm font-medium text-warm-50 dark:border-warm-100 dark:bg-warm-100 dark:text-warm-900">
              Tất cả
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
            Chưa có bài viết nào. Hãy quay lại sau nhé.
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
