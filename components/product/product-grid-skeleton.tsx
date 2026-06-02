import type { ReactElement } from 'react';

export default function ProductGridSkeleton({ count = 10 }: { count?: number }): ReactElement {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-4"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-square w-full rounded-2xl bg-warm-200 dark:bg-warm-800" />
          <div className="mt-2 h-4 w-3/4 rounded-lg bg-warm-200 dark:bg-warm-800" />
          <div className="mt-1.5 h-4 w-1/3 rounded-lg bg-warm-200 dark:bg-warm-800" />
        </div>
      ))}
    </div>
  );
}