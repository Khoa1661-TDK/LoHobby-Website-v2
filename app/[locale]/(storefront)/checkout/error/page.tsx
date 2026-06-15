// app/checkout/error/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout.error');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutErrorPage(): Promise<ReactElement> {
  const t = await getTranslations('checkout.error');
  return (
    <section className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t('heading')}</h1>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        {t('instructions')}
        <code className="mx-1 rounded bg-neutral-100 px-1 dark:bg-neutral-800">PAYOS_CLIENT_ID</code>,
        <code className="mx-1 rounded bg-neutral-100 px-1 dark:bg-neutral-800">PAYOS_API_KEY</code>,
        <code className="mx-1 rounded bg-neutral-100 px-1 dark:bg-neutral-800">PAYOS_CHECKSUM_KEY</code>.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {t('backToCatalog')}
      </Link>
    </section>
  );
}
