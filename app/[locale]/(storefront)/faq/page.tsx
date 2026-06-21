import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import {
  ContentSection,
  PageShell,
  StorefrontPageHeader,
  secondaryButtonClass,
} from '@/components/layout/page';
import { getSiteName } from '@/lib/brand';
import { buildFaqJsonLd, buildWebPageJsonLd, jsonLdToScriptString } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

const canonical = '/faq';

type FaqItem = { question: string; answer: string };
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const siteName = getSiteName();
  return {
    title: t('faqMetaTitle'),
    description: t('faqMetaDescription') + ' ' + siteName,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: t('faqMetaTitle'),
      description: t('faqMetaDescription') + ' ' + siteName,
      url: absoluteUrl(canonical),
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('faqMetaTitle'),
      description: t('faqMetaDescription') + ' ' + siteName,
    },
  };
}

export default async function FaqPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });

  const faqs: FaqItem[] = [
    { question: t('faqQ1'), answer: t('faqA1') },
    { question: t('faqQ2'), answer: t('faqA2') },
    { question: t('faqQ3'), answer: t('faqA3') },
    { question: t('faqQ4'), answer: t('faqA4') },
    { question: t('faqQ5'), answer: t('faqA5') },
    { question: t('faqQ6'), answer: t('faqA6') },
    { question: t('faqQ7'), answer: t('faqA7') },
  ];

  const RELATED_LINKS: { label: string; href: string }[] = [
    { label: t('faqLinkHowToOrder'), href: '/info/how-to-order' },
    { label: t('faqLinkPayment'), href: '/info/payment' },
    { label: t('faqLinkReturns'), href: '/info/returns' },
    { label: t('faqLinkTrackOrder'), href: '/info/track-order' },
    { label: t('faqLinkCustomPrint'), href: '/info/quy-trinh-in-3d-theo-yeu-cau' },
    { label: t('faqLinkContact'), href: '/contact' },
  ];

  const faqJsonLd = buildFaqJsonLd(faqs);
  const webPageJsonLd = buildWebPageJsonLd({
    name: t('faqMetaTitle'),
    description: t('faqMetaDescription'),
    path: canonical,
  });

  return (
    <>
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(faqJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(webPageJsonLd) }}
      />
      <PageShell width="narrow">
        <ContentSection>
          <StorefrontPageHeader
            title={t('faqHeading')}
            subtitle={t('faqMetaDescription')}
          />

          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-line bg-surface-raised p-5 shadow-soft-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-warm-900 dark:text-warm-100">
                  {faq.question}
                  <span className="text-accent transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-warm-600 dark:text-warm-400">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10">
            <h2 className="font-display text-lg font-semibold text-warm-900 dark:text-warm-100">
              {t('faqSeeMore')}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {RELATED_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={secondaryButtonClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </ContentSection>
      </PageShell>
      <Footer />
    </>
  );
}