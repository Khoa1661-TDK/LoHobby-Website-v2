import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import InfoPageLayout from '@/components/content/info-page';
import { getAllInfoSlugs, getInfoPage } from '@/lib/info-pages';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAllInfoSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const { slug } = await props.params;
  const page = getInfoPage(slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/info/${slug}` },
  };
}

export default async function InfoPage(props: { params: Params }): Promise<ReactElement> {
  const { slug } = await props.params;
  const page = getInfoPage(slug);
  if (!page) return notFound();

  return <InfoPageLayout page={page} />;
}
