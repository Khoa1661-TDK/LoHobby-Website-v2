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
      <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">{t('heading')}</h1>
      <p className="mt-4 rounded-2xl border border-terracotta-200 bg-terracotta-50 p-4 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300">
        {t('instructions')}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-6 py-3 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-300 hover:-translate-y-px hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
      >
        {t('backToCatalog')}
      </Link>
    </section>
  );
}
