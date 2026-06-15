// app/not-found.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: true },
};

export default function NotFound(): ReactElement {
  return (
    <section className="mx-auto max-w-xl p-8 text-center">
      <h1 className="font-serif text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        Trang hoặc sản phẩm bạn tìm không tồn tại hoặc đã được gỡ xuống.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Về trang chủ
      </Link>
    </section>
  );
}
