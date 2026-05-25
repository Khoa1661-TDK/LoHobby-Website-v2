// app/search/layout.tsx
import type { ReactElement, ReactNode } from 'react';
import { Suspense } from 'react';
import Footer from '@/components/layout/footer';
import Collections from '@/components/layout/search/collections';
import FilterList from '@/components/layout/search/filter';
import { sorting } from '@/lib/constants';

const childrenWrapperClasses = 'order-last min-h-screen w-full md:order-none';

export default function SearchLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <>
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-col gap-8 px-4 pb-4 text-black md:flex-row dark:text-white">
        <div className="order-first w-full flex-none md:max-w-[125px]">
          <Suspense fallback={null}>
            <Collections />
          </Suspense>
        </div>
        <div className={childrenWrapperClasses}>
          <Suspense>{children}</Suspense>
        </div>
        <div className="order-none flex-none md:order-last md:w-[125px]">
          <FilterList list={sorting} title="Sort by" />
        </div>
      </div>
      <Footer />
    </>
  );
}
