import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
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
      <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('contactHeading')}</h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          {t('contactDescription', { storeName: branding.storeName })}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ContactForm />

          <aside className="space-y-4 text-sm">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {t('contactSidebarEmail')}
              </h2>
              <a
                href={`mailto:${branding.contact.email}`}
                className="mt-1 block text-neutral-800 hover:underline dark:text-neutral-200"
              >
                {branding.contact.email}
              </a>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {t('contactSidebarHotline')}
              </h2>
              <a
                href={`tel:${branding.contact.phone.replace(/\s/g, '')}`}
                className="mt-1 block text-neutral-800 hover:underline dark:text-neutral-200"
              >
                {branding.contact.phone}
              </a>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {t('contactSidebarAddress')}
              </h2>
              <p className="mt-1 text-neutral-700 dark:text-neutral-300">
                {branding.contact.address}
              </p>
            </div>
          </aside>
        </div>
      </section>
      <Footer />
    </>
  );
}