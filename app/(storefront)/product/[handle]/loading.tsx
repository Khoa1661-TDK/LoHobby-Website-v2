import type { ReactElement } from 'react';

export default function ProductLoading(): ReactElement {
  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) px-4">
      <div className="py-4">
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="h-full w-full basis-full md:basis-1/2">
          <div className="aspect-square w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 w-16 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        </div>
        <div className="basis-full space-y-4 md:basis-1/2">
          <div className="h-8 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-24 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-12 w-full animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
