'use client';

import { useEffect, type ReactElement } from 'react';

export default function StorefrontError({
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
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Đã có lỗi xảy ra</h1>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        Rất tiếc, trang này không tải được. Vui lòng thử lại trong giây lát.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        Thử lại
      </button>
    </div>
  );
}
