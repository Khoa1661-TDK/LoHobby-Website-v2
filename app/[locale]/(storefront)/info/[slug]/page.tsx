import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import InfoPageLayout from '@/components/content/info-page';
import { getSiteName } from '@/lib/brand';
import { getAllInfoSlugs, getInfoPage } from '@/lib/info-pages';
import type { Locale } from '@/i18n/routing';
import { buildWebPageJsonLd, jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

type Params = Promise<{ slug: string; locale: Locale }>;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAllInfoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug, locale } = await props.params;
  const page = getInfoPage(slug, locale);
  if (!page) return {};

  const canonical = `/info/${slug}`;

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: page.title,
      description: page.description,
      url: absoluteUrl(canonical),
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
    },
  };
}

export default async function InfoPage(props: { params: Params }): Promise<ReactElement> {
  const { slug, locale } = await props.params;
  const page = getInfoPage(slug, locale);
  if (!page) return notFound();

  const webPageJsonLd = buildWebPageJsonLd({
    name: page.title,
    description: page.description,
    path: `/info/${slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(webPageJsonLd) }}
      />
      <InfoPageLayout page={page} />
    </>
  );
}
