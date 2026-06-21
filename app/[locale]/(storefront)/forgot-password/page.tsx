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
        <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-raised p-6 shadow-soft-md">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
            {t('forgotPasswordHeading')}
          </h1>
          <p className="mb-6 text-sm text-warm-600 dark:text-warm-400">
            {t('forgotPasswordInstruction')}
          </p>
          <ForgotPasswordForm />
        </div>
      </section>
      <Footer />
    </>
  );
}
