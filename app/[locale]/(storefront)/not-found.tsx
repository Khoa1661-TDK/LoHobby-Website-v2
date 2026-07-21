// app/[locale]/(storefront)/not-found.tsx — renders inside the storefront
// layout, so the navbar (with search) and footer are already present.
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Footer from '@/components/layout/footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('notFound');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: true },
  };
}

export default async function NotFound(): Promise<ReactElement> {
  const t = await getTranslations('notFound');

  return (
    <>
      <section className="mx-auto max-w-xl px-4 py-16 text-center md:py-24">
        <p className="font-display text-6xl font-bold tracking-tight text-warm-300 dark:text-warm-700">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">
          {t('heading')}
        </h1>
        <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">{t('body')}</p>
        <p className="mt-1.5 text-sm text-warm-500 dark:text-warm-500">{t('helpBody')}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
          >
            {t('homeCta')}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-warm-200/80 px-5 py-2.5 text-sm font-semibold text-warm-800 transition-all duration-200 hover:bg-warm-100/60 active:scale-[0.98] dark:border-warm-800/60 dark:text-warm-200 dark:hover:bg-warm-800/50"
          >
            {t('browseCta')}
          </Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
