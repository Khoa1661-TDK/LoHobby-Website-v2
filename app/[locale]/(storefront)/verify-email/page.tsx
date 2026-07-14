import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import Footer from '@/components/layout/footer';
import ResendVerificationForm from '@/components/resend-verification-form';
import { consumeVerificationToken } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: t('verifyEmailMetaTitle'),
    description: t('verifyEmailMetaDescription'),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{ token?: string }>;

export default async function VerifyEmailPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const t = await getTranslations('auth');
  const { token } = await props.searchParams;

  const result = token ? await consumeVerificationToken(token) : ({ status: 'invalid' } as const);

  let continueHref = '/login';
  if (result.status === 'success') {
    const session = await auth();
    if (session?.user?.email?.toLowerCase() === result.email) {
      continueHref = '/checkout';
    }
  }

  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-raised p-6 shadow-soft-md">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
            {t('verifyEmailHeading')}
          </h1>
          {result.status === 'success' ? (
            <>
              <p className="mb-6 text-sm text-warm-600 dark:text-warm-400">
                {t('verifyEmailSuccessBody')}
              </p>
              <Link
                href={continueHref}
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                {continueHref === '/checkout'
                  ? t('verifyEmailContinueCheckout')
                  : t('verifyEmailContinueLogin')}
              </Link>
            </>
          ) : (
            <>
              <p className="mb-6 rounded-xl border border-terracotta-200 bg-terracotta-50 px-3 py-2.5 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300">
                {t('verifyEmailNeedsLinkBody')}
              </p>
              <ResendVerificationForm />
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
