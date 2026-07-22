import type { ReactElement } from 'react';

export default function BlogLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10">
      <div className="mb-8 h-8 w-56 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-warm-200/60 dark:border-warm-800/40">
            <div className="aspect-[16/10] w-full animate-pulse bg-warm-200 dark:bg-warm-800" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
