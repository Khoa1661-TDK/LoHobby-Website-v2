// app/(storefront)/p/[slug]/page.tsx — Page builder route
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import { getPageBySlug } from '@/lib/page-builder';
import { getResolvedSiteName } from '@/lib/store-settings';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPageBySlug(slug);
  if (!page) return { title: 'Page not found' };

  const siteName = await getResolvedSiteName();
  const seoTitle =
    typeof page.meta?.title === 'string' && page.meta.title.trim()
      ? page.meta.title.trim()
      : page.title;
  const seoDescription =
    typeof page.meta?.description === 'string' && page.meta.description.trim()
      ? page.meta.description.trim()
      : undefined;

  return {
    title: `${seoTitle} | ${siteName}`,
    description: seoDescription,
  };
}

export const revalidate = 60;

export default async function PageBuilderPage(props: PageProps): Promise<ReactElement> {
  const { slug } = await props.params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <article>
      <RenderBlocks blocks={page.layout} />
    </article>
  );
}