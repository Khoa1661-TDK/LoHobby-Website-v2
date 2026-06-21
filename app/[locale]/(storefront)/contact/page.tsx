import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import { ContentSection, PageShell, StorefrontPageHeader } from '@/components/layout/page';
import { getStoreBranding } from '@/lib/store-branding';
import { absoluteUrl } from '@/lib/utils';
import { jsonLdToScriptString } from '@/lib/seo';
import ContactForm from './contact-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const branding = await getStoreBranding();
  return {
    title: t('contactMetaTitle'),
    description: t('contactMetaDescription', { storeName: branding.storeName }),
    alternates: { canonical: '/contact' },
    openGraph: {
      type: 'website',
      title: t('contactMetaTitle'),
      description: t('contactMetaDescription', { storeName: branding.storeName }),
      url: absoluteUrl('/contact'),
      siteName: branding.storeName,
    },
    twitter: { card: 'summary_large_image', title: t('contactMetaTitle'), description: t('contactMetaDescription', { storeName: branding.storeName }) },
  };
}

export default async function ContactPage({ params }: Props): Promise<ReactElement> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'info' });
  const branding = await getStoreBranding();

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: branding.storeName,
    description: t('contactDescription', { storeName: branding.storeName }),
    url: absoluteUrl('/contact'),
    email: branding.contact.email,
    telephone: branding.contact.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: branding.contact.address,
      addressCountry: 'VN',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdToScriptString(localBusinessJsonLd) }}
      />
      <PageShell width="normal">
        <ContentSection>
          <StorefrontPageHeader
            title={t('contactHeading')}
            subtitle={t('contactDescription', { storeName: branding.storeName })}
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ContactForm />

            <aside className="space-y-4 text-sm">
              <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-soft-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
                  {t('contactSidebarEmail')}
                </h2>
                <a
                  href={`mailto:${branding.contact.email}`}
                  className="mt-1 block text-warm-800 hover:underline dark:text-warm-200"
                >
                  {branding.contact.email}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-soft-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
                  {t('contactSidebarHotline')}
                </h2>
                <a
                  href={`tel:${branding.contact.phone.replace(/\s/g, '')}`}
                  className="mt-1 block text-warm-800 hover:underline dark:text-warm-200"
                >
                  {branding.contact.phone}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-surface-raised p-5 shadow-soft-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
                  {t('contactSidebarAddress')}
                </h2>
                <p className="mt-1 text-warm-700 dark:text-warm-300">
                  {branding.contact.address}
                </p>
              </div>
            </aside>
          </div>
        </ContentSection>
      </PageShell>
      <Footer />
    </>
  );
}