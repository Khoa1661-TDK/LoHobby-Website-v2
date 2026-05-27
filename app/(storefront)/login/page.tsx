// app/(storefront)/login/page.tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import AuthForm from '@/components/auth-form';
import Footer from '@/components/layout/footer';
import { isAdminEmail } from '@/lib/admin-emails';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập hoặc tạo tài khoản để theo dõi đơn hàng và lưu mô hình yêu thích.',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { callbackUrl, error } = await props.searchParams;
  const safeCallback =
    callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') ? callbackUrl : '/';

  const session = await auth();
  if (session?.user?.email && !error) {
    if (safeCallback.startsWith('/admin') && !isAdminEmail(session.user.email)) {
      return (
        <>
          <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <h1 className="mb-2 text-2xl font-bold tracking-tight">Cần quyền quản trị</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Bạn đang đăng nhập bằng{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {session.user.email}
                </span>
                , nhưng tài khoản này không nằm trong danh sách quản trị viên.
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
            className="mx-auto mb-4 max-w-md rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {decodeURIComponent(error.replace(/\+/g, ' '))}
          </p>
        ) : null}
        <AuthForm callbackUrl={safeCallback} />
      </section>
      <Footer />
    </>
  );
}
