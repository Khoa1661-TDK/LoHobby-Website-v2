// app/not-found.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound(): ReactElement {
  return (
    <section className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-2xl font-semibold">Print not found</h1>
      <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
        That toy must have failed mid-print. The page or product you requested does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600"
      >
        Back to the print shop
      </Link>
    </section>
  );
}
