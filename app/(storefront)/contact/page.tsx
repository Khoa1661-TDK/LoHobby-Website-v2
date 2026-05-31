import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import { getStoreBranding } from '@/lib/store-branding';
import { absoluteUrl } from '@/lib/utils';
import { jsonLdToScriptString } from '@/lib/seo';
import ContactForm from './contact-form';

const title = 'Liên hệ';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getStoreBranding();
  const description = `Liên hệ với ${branding.storeName} về đơn hàng, sản phẩm hoặc hợp tác. Chúng tôi phản hồi trong vòng một ngày làm việc.`;
  return {
    title,
    description,
    alternates: { canonical: '/contact' },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl('/contact'),
      siteName: branding.storeName,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ContactPage(): Promise<ReactElement> {
  const branding = await getStoreBranding();
  const description = `Liên hệ với ${branding.storeName} về đơn hàng, sản phẩm hoặc hợp tác.`;

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: branding.storeName,
    description,
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
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">{description}</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ContactForm />

          <aside className="space-y-4 text-sm">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Email
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
                Hotline
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
                Địa chỉ
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
