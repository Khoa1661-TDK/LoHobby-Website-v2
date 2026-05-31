// app/(storefront)/pages/[slug]/page.tsx — CMS content pages (Phase 3)
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { getContentPageBySlug, type ContentBlock } from '@/lib/content-pages';
import { isContentPagesEnabled } from '@/lib/feature-flags';
import { getResolvedSiteName } from '@/lib/store-settings';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getContentPageBySlug(slug);
  if (!page) return { title: 'Không tìm thấy' };
  const siteName = await getResolvedSiteName();
  return {
    title: `${page.title} | ${siteName}`,
    description: page.metaDescription ?? undefined,
  };
}

export default async function ContentPage(props: PageProps): Promise<ReactElement> {
  if (!isContentPagesEnabled()) {
    notFound();
  }

  const { slug } = await props.params;
  const page = await getContentPageBySlug(slug);
  if (!page) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">{page.title}</h1>
      <div className="mt-8 space-y-10">
        {page.blocks.map((block, index) => (
          <BlockRenderer key={index} block={block} />
        ))}
      </div>
      <p className="mt-12 text-center text-sm text-neutral-500">
        <Link href="/" className="underline hover:text-neutral-800">
          ← Về cửa hàng
        </Link>
      </p>
    </article>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }): ReactElement {
  if (block.blockType === 'hero') {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-800 dark:bg-neutral-900">
        {block.imageUrl ? (
          <div className="relative mb-6 aspect-[2/1] overflow-hidden rounded-xl">
            <Image src={block.imageUrl} alt="" fill className="object-cover" sizes="768px" />
          </div>
        ) : null}
        <h2 className="text-2xl font-semibold">{block.headline}</h2>
        {block.subheadline ? (
          <p className="mt-2 text-neutral-600 dark:text-neutral-300">{block.subheadline}</p>
        ) : null}
        {block.ctaHref && block.ctaLabel ? (
          <Link
            href={block.ctaHref}
            className="mt-4 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white"
          >
            {block.ctaLabel}
          </Link>
        ) : null}
      </section>
    );
  }

  if (block.blockType === 'richText') {
    return (
      <section className="prose prose-neutral max-w-none dark:prose-invert">
        {block.content.split('\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-filament-500 p-8 text-center text-white">
      <h2 className="text-xl font-semibold">{block.title}</h2>
      {block.body ? <p className="mt-2 opacity-90">{block.body}</p> : null}
      <Link
        href={block.buttonHref}
        className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-filament-700"
      >
        {block.buttonLabel}
      </Link>
    </section>
  );
}
