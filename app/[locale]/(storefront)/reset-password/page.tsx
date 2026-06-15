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
        <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">{t('resetPasswordHeading')}</h1>
          {token ? (
            <>
              <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
                {t('resetPasswordInstruction')}
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {t('resetPasswordInvalidToken')}
            </p>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
