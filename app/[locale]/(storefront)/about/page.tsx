import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import {
  ContentSection,
  PageShell,
  StorefrontPageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/layout/page';
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
      <PageShell width="narrow">
        <ContentSection>
          <StorefrontPageHeader
            eyebrow={BRAND_ORIGIN}
            title={t('aboutHeading', { siteName })}
            subtitle={BRAND_DESCRIPTION}
          />

          <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
            <p>{t('aboutStoryP1', { siteName })}</p>
            <p>{t('aboutStoryP2')}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-line bg-surface-raised p-5 shadow-soft-sm"
              >
                <h2 className="text-base font-semibold">{value.title}</h2>
                <p className="mt-2 text-sm text-warm-600 dark:text-warm-400">{value.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/search" className={primaryButtonClass}>
              {t('aboutCtaBrowse')}
            </Link>
            <Link href="/contact" className={secondaryButtonClass}>
              {t('aboutCtaContact')}
            </Link>
          </div>
        </ContentSection>
      </PageShell>
      <Footer />
    </>
  );
}