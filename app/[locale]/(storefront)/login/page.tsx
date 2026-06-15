// app/[locale]/(storefront)/login/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import AuthForm from '@/components/auth-form';
import Footer from '@/components/layout/footer';
import { isAdminEmail } from '@/lib/admin-emails';

type LocaleParams = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { callbackUrl, error } = await props.searchParams;
  const t = await getTranslations('auth');
  const safeCallback =
    callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/';

  const session = await auth();
  if (session?.user?.email && !error) {
    if (safeCallback.startsWith('/admin') && !isAdminEmail(session.user.email)) {
      return (
        <>
          <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-warm-200/80 bg-white p-6 shadow-soft-md dark:border-warm-800/40 dark:bg-warm-900">
              <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">{t('adminRequiredTitle')}</h1>
              <p className="text-sm text-warm-500 dark:text-warm-400">
                {t('adminRequiredBefore')}
                <span className="font-medium text-warm-900 dark:text-warm-100">
                  {session.user.email}
                </span>
                {t('adminRequiredAfter')}
              </p>
            </div>
          </section>
          <Footer />
        </>
      );
    }

    redirect(safeCallback);
  }

  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        {error ? (
          <p
            role="alert"
            className="mx-auto mb-4 max-w-md rounded-xl border border-terracotta-200 bg-terracotta-50 px-3 py-2.5 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300"
          >
            {decodeURIComponent(error.replace(/\+/g, ' '))}
          </p>
        ) : null}
        <AuthForm callbackUrl={safeCallback} />
        <p className="mx-auto mt-4 max-w-md text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-warm-500 transition-colors hover:text-warm-800 dark:text-warm-400 dark:hover:text-warm-200"
          >
            {t('forgotPassword')}
          </Link>
        </p>
      </section>
      <Footer />
    </>
  );
}
