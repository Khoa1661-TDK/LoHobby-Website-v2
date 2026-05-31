import type { ReactElement } from 'react';

export default function ProductGridSkeleton({ count = 10 }: { count?: number }): ReactElement {
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5 lg:gap-3"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-square w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-2 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-1.5 h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}
