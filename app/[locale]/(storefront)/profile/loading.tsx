import type { ReactElement } from 'react';

export default function ProfileLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-screen-lg px-4 py-10">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-warm-200 dark:bg-warm-800" />
      <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-xl bg-warm-200 dark:bg-warm-800" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse rounded-2xl bg-warm-200 dark:bg-warm-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
