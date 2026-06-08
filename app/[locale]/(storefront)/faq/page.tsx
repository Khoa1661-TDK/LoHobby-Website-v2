import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
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
    description: t('faqMetaDescription') + siteName,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: t('faqMetaTitle'),
      description: t('faqMetaDescription') + siteName,
      url: absoluteUrl(canonical),
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('faqMetaTitle'),
      description: t('faqMetaDescription') + siteName,
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
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('faqHeading')}</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">{t('faqMetaDescription')}</p>

        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                {faq.question}
                <span className="text-neutral-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold">{t('faqSeeMore')}</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {RELATED_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-neutral-600 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Footer />
    </>
  );
}