// app/[locale]/(storefront)/pages/[slug]/page.tsx — storefront page builder route
import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import PreviewRefresh from '@/components/blocks/PreviewRefresh';
import { fetchPageBySlugDraft, getPageBySlug, type PageDoc } from '@/lib/page-builder';
import { type Locale } from '@/i18n/routing';
import { getResolvedSiteName } from '@/lib/store-settings';

type PageProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

async function loadPage(slug: string, locale: Locale): Promise<PageDoc | null> {
  const { isEnabled } = await draftMode();
  return isEnabled ? fetchPageBySlugDraft(slug, locale) : getPageBySlug(slug, locale);
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug, locale } = await props.params;
  const page = await loadPage(slug, locale);
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
  const { slug, locale } = await props.params;
  const { isEnabled: isDraft } = await draftMode();
  const page = await loadPage(slug, locale);

  if (!page) {
    notFound();
  }

  return (
    <article>
      {isDraft ? <PreviewRefresh /> : null}
      <RenderBlocks blocks={page.layout} />
    </article>
  );
}
