import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import {
  BRAND_DESCRIPTION,
  BRAND_ORIGIN,
  BRAND_TAGLINE,
  getSiteName,
} from '@/lib/brand';
import { jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const siteName = getSiteName();
  const title = t('aboutMetaTitle');
  const description = `${siteName} là xưởng in 3D đồ chơi, mô hình, figure và móc khóa tại Việt Nam. ${BRAND_TAGLINE}.`;
  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/about'),
      siteName,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function AboutPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const siteName = getSiteName();

  const title = t('aboutMetaTitle');
  const description = `${siteName} là xưởng in 3D đồ chơi, mô hình, figure và móc khóa tại Việt Nam. ${BRAND_TAGLINE}.`;

  const values = [
    { title: t('aboutValueCustomTitle'), body: t('aboutValueCustomBody') },
    { title: t('aboutValueMaterialTitle'), body: t('aboutValueMaterialBody') },
    {
      title: t('aboutValueWarrantyTitle'),
      body: `${BRAND_TAGLINE}. ${t('aboutValueWarrantyBody')}`,
    },
    { title: t('aboutValueDeliveryTitle'), body: t('aboutValueDeliveryBody') },
  ];

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    description,
    url: absoluteUrl('/about'),
    publisher: { '@type': 'Organization', name: siteName },
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(webPageJsonLd) }}
      />
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-filament-600 dark:text-filament-300">
          {BRAND_ORIGIN}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          {t('aboutHeading', { siteName })}
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">{BRAND_DESCRIPTION}</p>

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          <p>{t('aboutStoryP1', { siteName })}</p>
          <p>{t('aboutStoryP2')}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <h2 className="text-base font-semibold">{value.title}</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {t('aboutCtaBrowse')}
          </Link>
          <Link
            href="/contact"
            className="inline-flex rounded-full border border-neutral-300 px-6 py-2.5 text-sm font-medium transition hover:border-neutral-500 dark:border-neutral-700"
          >
            {t('aboutCtaContact')}
          </Link>
        </div>
      </section>
      <Footer />
    </>
  );
}