import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import { Link } from '@/i18n/navigation';
import {
  ContentSection,
  PageShell,
  StorefrontPageHeader,
} from '@/components/layout/page';
import { getSiteName } from '@/lib/brand';
import type { Locale } from '@/i18n/routing';
import { getInfoPageSummaries } from '@/lib/info-pages';
import { buildWebPageJsonLd, jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const siteName = getSiteName();

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const title = t('indexMetaTitle');
  const description = t('indexMetaDescription');
  return {
    title,
    description,
    alternates: { canonical: '/info' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/info'),
      siteName,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function InfoIndexPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const pages = getInfoPageSummaries(locale);

  const webPageJsonLd = buildWebPageJsonLd({
    name: t('indexMetaTitle'),
    description: t('indexMetaDescription'),
    path: '/info',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(webPageJsonLd) }}
      />
      <PageShell width="narrow">
        <ContentSection>
          <StorefrontPageHeader
            eyebrow={t('indexEyebrow')}
            title={t('indexHeading')}
            subtitle={t('indexSubtitle')}
          />

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/info/${page.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-surface-raised p-5 shadow-soft-sm transition-all duration-200 hover:-translate-y-px hover:border-warm-400 hover:shadow-soft-md"
                >
                  <h2 className="text-base font-semibold text-warm-900 transition-colors group-hover:text-accent dark:text-warm-100">
                    {page.title}
                  </h2>
                  <p className="mt-2 text-sm text-warm-600 dark:text-warm-400">
                    {page.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </ContentSection>
      </PageShell>
      <Footer />
    </>
  );
}
