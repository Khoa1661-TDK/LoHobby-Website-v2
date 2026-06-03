// app/checkout/error/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thanh toán thất bại',
  robots: { index: false, follow: false },
};

export default function CheckoutErrorPage(): ReactElement {
  return (
    <section className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Thanh toán thất bại</h1>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Không thể tạo yêu cầu thanh toán VietQR cho giỏ hàng. Kiểm tra log máy chủ và xác minh
        <code className="mx-1 rounded bg-neutral-100 px-1 dark:bg-neutral-800">PAYOS_CLIENT_ID</code>,
        <code className="mx-1 rounded bg-neutral-100 px-1 dark:bg-neutral-800">PAYOS_API_KEY</code>,
        <code className="mx-1 rounded bg-neutral-100 px-1 dark:bg-neutral-800">PAYOS_CHECKSUM_KEY</code>.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Quay lại danh mục
      </Link>
    </section>
  );
}
