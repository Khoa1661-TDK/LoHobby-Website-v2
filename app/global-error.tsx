// app/global-error.tsx — last-resort boundary for errors thrown in the root
// layout itself, where the storefront error.tsx cannot catch them.
//
// Next.js requires this to be a client component rendering its own
// <html>/<body>. It also sits outside NextIntlClientProvider, so the copy is
// the default locale (vi) rather than translated.
'use client';

import { useEffect, type ReactElement } from 'react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="bg-warm-50 text-warm-900 dark:bg-warm-950 dark:text-warm-100">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">Đã có lỗi xảy ra</h1>
          <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">
            Rất tiếc, trang này không tải được. Vui lòng thử lại trong giây lát.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 transition-all duration-200 hover:bg-warm-800 active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
            >
              Thử lại
            </button>
            <a
              href="/vi"
              className="inline-flex rounded-xl border border-warm-200/80 px-5 py-2.5 text-sm font-semibold text-warm-800 transition-all duration-200 hover:bg-warm-100/60 dark:border-warm-800/60 dark:text-warm-200 dark:hover:bg-warm-800/50"
            >
              Về trang chủ
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
