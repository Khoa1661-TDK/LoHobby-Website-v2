// components/blog/post-card.tsx — editorial blog post tile (Content)
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { BlogPostSummary } from '@/lib/blog';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

type Props = {
  post: BlogPostSummary;
  priority?: boolean;
  index?: number;
};

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

export default function PostCard({ post, priority, index = 0 }: Props): ReactElement {
  const publishedLabel = formatPublishedDate(post.publishedAt);

  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-warm-200/80 bg-white shadow-soft-sm transition-all duration-300 hover:-translate-y-1 hover:border-warm-300/80 hover:shadow-soft-md dark:border-warm-800/40 dark:bg-warm-900 dark:hover:border-warm-700/60 dark:hover:shadow-soft-lg"
      aria-label={post.title}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-warm-100/50 dark:bg-warm-950">
        {post.coverImageUrl ? (
          <Image
            src={toNextImageSrc(post.coverImageUrl)}
            alt={post.title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="img-fit object-cover transition duration-500 ease-smooth group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-warm-100 to-warm-200 dark:from-warm-900 dark:to-warm-950">
            <span className="font-serif text-3xl font-semibold text-warm-300 dark:text-warm-700">
              {post.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {post.category ? (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warm-700 shadow-sm backdrop-blur-sm dark:bg-warm-950/90 dark:text-warm-200">
            {post.category.name}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {publishedLabel ? (
          <time
            dateTime={post.publishedAt ?? undefined}
            className="text-xs font-medium uppercase tracking-wide text-warm-400 dark:text-warm-500"
          >
            {publishedLabel}
          </time>
        ) : null}

        <h3 className="line-clamp-2 font-serif text-lg font-bold leading-snug tracking-tight text-warm-900 transition-colors duration-200 group-hover:text-terracotta-600 dark:text-warm-100 dark:group-hover:text-terracotta-400">
          {post.title}
        </h3>

        {post.excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-warm-600 dark:text-warm-400">
            {post.excerpt}
          </p>
        ) : null}

        <span className="mt-auto pt-2 text-sm font-semibold text-terracotta-600 dark:text-terracotta-400">
          Đọc bài viết →
        </span>
      </div>
    </Link>
  );
}
