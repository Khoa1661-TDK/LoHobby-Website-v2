import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import Footer from '@/components/layout/footer';
import ResetPasswordForm from './reset-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: t('resetPasswordMetaTitle'),
    description: t('resetPasswordMetaDescription'),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const t = await getTranslations('auth');
  const { token } = await props.searchParams;

  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-raised p-6 shadow-soft-md">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
            {t('resetPasswordHeading')}
          </h1>
          {token ? (
            <>
              <p className="mb-6 text-sm text-warm-600 dark:text-warm-400">
                {t('resetPasswordInstruction')}
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="rounded-xl border border-terracotta-200 bg-terracotta-50 px-3 py-2.5 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300">
              {t('resetPasswordInvalidToken')}
            </p>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
