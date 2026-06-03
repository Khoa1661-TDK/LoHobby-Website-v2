// app/(storefront)/blog/[slug]/page.tsx — single published post article (Content)
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import Footer from '@/components/layout/footer';
import { getPostBySlug } from '@/lib/blog';
import { getSiteName } from '@/lib/brand';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import { buildBreadcrumbJsonLd, jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatPublishedDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Không tìm thấy bài viết' };

  const canonical = `/blog/${post.slug}`;
  const description = post.excerpt ?? `${post.title} — ${siteName}`;
  const ogImage = post.coverImageUrl ? absoluteUrl(post.coverImageUrl) : undefined;

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: absoluteUrl(canonical),
      siteName,
      publishedTime: post.publishedAt ?? undefined,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags,
      ...(ogImage ? { images: [{ url: ogImage, alt: post.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function BlogPostPage(props: {
  params: Params;
}): Promise<ReactElement> {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const canonical = `/blog/${post.slug}`;
  const publishedLabel = formatPublishedDate(post.publishedAt);
  const body = (post.body ?? null) as SerializedEditorState | null;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Trang chủ', path: '/' },
    { name: 'Blog', path: '/blog' },
    ...(post.category
      ? [{ name: post.category.name, path: `/blog/category/${post.category.slug}` }]
      : []),
    { name: post.title, path: canonical },
  ]);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(canonical),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(canonical) },
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.coverImageUrl ? { image: [absoluteUrl(post.coverImageUrl)] } : {}),
    ...(post.publishedAt
      ? { datePublished: post.publishedAt, dateModified: post.publishedAt }
      : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
    ...(post.category
      ? { articleSection: post.category.name }
      : {}),
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: siteName },
    publisher: { '@type': 'Organization', name: siteName },
  };

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
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(articleJsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 pb-16">
        <Breadcrumbs
          items={[
            { name: 'Trang chủ', href: '/' },
            { name: 'Blog', href: '/blog' },
            ...(post.category
              ? [{ name: post.category.name, href: `/blog/category/${post.category.slug}` }]
              : []),
            { name: post.title },
          ]}
        />

        <header className="border-b border-warm-200/70 pb-8 dark:border-warm-800/50">
          {post.category ? (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="inline-flex items-center rounded-lg bg-warm-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-warm-700 transition-colors hover:bg-warm-200 dark:bg-warm-900 dark:text-warm-300 dark:hover:bg-warm-800"
            >
              {post.category.name}
            </Link>
          ) : null}

          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mt-4 text-lg leading-relaxed text-warm-600 dark:text-warm-400">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-warm-500 dark:text-warm-400">
            {post.author ? (
              <span className="font-medium text-warm-700 dark:text-warm-300">{post.author}</span>
            ) : null}
            {post.author && publishedLabel ? (
              <span aria-hidden className="text-warm-300 dark:text-warm-700">
                ·
              </span>
            ) : null}
            {publishedLabel ? (
              <time dateTime={post.publishedAt ?? undefined}>{publishedLabel}</time>
            ) : null}
          </div>
        </header>

        {post.coverImageUrl ? (
          <figure className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-warm-100/50 dark:bg-warm-950">
            <Image
              src={toNextImageSrc(post.coverImageUrl)}
              alt={post.title}
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="img-fit object-cover"
            />
          </figure>
        ) : null}

        {body ? (
          <RichText
            data={body}
            className="prose prose-warm mt-10 max-w-none dark:prose-invert prose-headings:font-serif prose-headings:tracking-tight prose-a:text-terracotta-600 dark:prose-a:text-terracotta-400 prose-img:rounded-xl"
          />
        ) : (
          <p className="mt-10 text-warm-500 dark:text-warm-400">
            Bài viết này hiện chưa có nội dung.
          </p>
        )}

        {post.tags.length > 0 ? (
          <footer className="mt-12 border-t border-warm-200/70 pt-6 dark:border-warm-800/50">
            <ul className="flex flex-wrap gap-2" aria-label="Thẻ">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-lg bg-warm-100 px-3 py-1 text-sm text-warm-600 dark:bg-warm-900 dark:text-warm-400"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          </footer>
        ) : null}

        <div className="mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta-600 transition-colors hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
          >
            ← Quay lại Blog
          </Link>
        </div>
      </article>

      <Footer />
    </>
  );
}
