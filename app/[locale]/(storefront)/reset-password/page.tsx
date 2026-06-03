import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import ResetPasswordForm from './reset-password-form';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const { token } = await props.searchParams;

  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Đặt lại mật khẩu</h1>
          {token ? (
            <>
              <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              Liên kết không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.
            </p>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
