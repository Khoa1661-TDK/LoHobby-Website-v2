// app/search/layout.tsx
import { getTranslations } from 'next-intl/server';
import type { ReactElement, ReactNode } from 'react';
import { Suspense } from 'react';
import Footer from '@/components/layout/footer';
import Collections from '@/components/layout/search/collections';
import FilterList from '@/components/layout/search/filter';
import Facets from '@/components/layout/search/filter/facets';
import { sorting } from '@/lib/constants';

const childrenWrapperClasses = 'order-last min-h-screen w-full md:order-none';

export default async function SearchLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const t = await getTranslations('search');
  return (
    <>
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 pb-4 text-black md:flex-row md:gap-6 dark:text-white">
        <div className="order-first w-full flex-none md:w-44 md:shrink-0 lg:w-48">
          <Suspense fallback={null}>
            <Collections />
          </Suspense>
        </div>
        <div className={childrenWrapperClasses}>
          <Suspense>{children}</Suspense>
        </div>
        <div className="order-none flex-none space-y-6 md:order-last md:w-36 md:shrink-0 lg:w-40">
          <Suspense fallback={null}>
            <FilterList list={sorting} title={t('filter.sortTitle')} />
          </Suspense>
          <Suspense fallback={null}>
            <Facets />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
