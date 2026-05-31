import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import ForgotPasswordForm from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Đặt lại mật khẩu tài khoản của bạn.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage(): ReactElement {
  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Quên mật khẩu</h1>
          <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
            Nhập email của bạn. Nếu email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </p>
          <ForgotPasswordForm />
        </div>
      </section>
      <Footer />
    </>
  );
}
