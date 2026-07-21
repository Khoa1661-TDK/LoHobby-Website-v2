// app/not-found.tsx — for requests that never resolve to a locale segment.
//
// This renders under the pass-through root layout (app/layout.tsx returns its
// children verbatim), so unlike a normal Next.js page it must supply its own
// <html> and <body>. It also sits outside NextIntlClientProvider, so it cannot
// use next-intl; copy is the default locale (vi) as a fallback.
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: true },
};

export default function RootNotFound(): ReactElement {
  return (
    <html lang="vi">
      <body className="bg-warm-50 text-warm-900 dark:bg-warm-950 dark:text-warm-100">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
          <p className="font-display text-6xl font-bold tracking-tight text-warm-300 dark:text-warm-700">
            404
          </p>
          <h1 className="mt-4 font-display text-2xl font-semibold">Không tìm thấy trang</h1>
          <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">
            Trang bạn tìm không tồn tại hoặc đã được gỡ xuống.
          </p>
          <Link
            href="/vi"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 transition-all duration-200 hover:bg-warm-800 active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
          >
            Về trang chủ
          </Link>
        </main>
      </body>
    </html>
  );
}
