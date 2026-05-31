import type { ReactElement } from 'react';
import Footer from '@/components/layout/footer';
import type { InfoPage } from '@/lib/info-pages';

export default function InfoPageLayout({ page }: { page: InfoPage }): ReactElement {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{page.title}</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">{page.description}</p>
        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          <p>{page.body}</p>
        </div>
      </section>
      <Footer />
    </>
  );
}
