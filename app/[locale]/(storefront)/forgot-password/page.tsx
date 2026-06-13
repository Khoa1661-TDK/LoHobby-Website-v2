import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import Footer from '@/components/layout/footer';
import ForgotPasswordForm from './forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: t('forgotPasswordMetaTitle'),
    description: t('forgotPasswordMetaDescription'),
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage(): Promise<ReactElement> {
  const t = await getTranslations('auth');

  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">{t('forgotPasswordHeading')}</h1>
          <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
            {t('forgotPasswordInstruction')}
          </p>
          <ForgotPasswordForm />
        </div>
      </section>
      <Footer />
    </>
  );
}
