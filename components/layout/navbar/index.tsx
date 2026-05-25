// components/layout/navbar/index.tsx
import Link from 'next/link';
import { Suspense, type ReactElement } from 'react';
import LogoSquare from '@/components/logo-square';
import { getMenu } from '@/lib/shopify';
import type { Menu } from '@/lib/shopify/types';
import Cart from '@/components/cart';
import MobileMenu from '@/components/layout/navbar/mobile-menu';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';

const { NEXT_PUBLIC_SITE_NAME } = process.env;

export async function Navbar(): Promise<ReactElement> {
  const menu: Menu[] = await getMenu('next-js-frontend-header-menu');
  const siteName = NEXT_PUBLIC_SITE_NAME ?? 'Local Store';

  return (
    <nav className="relative flex items-center justify-between p-4 lg:px-6">
      <div className="block flex-none md:hidden">
        <Suspense fallback={null}>
          <MobileMenu menu={menu} />
        </Suspense>
      </div>
      <div className="flex w-full items-center">
        <div className="flex w-full md:w-1/3">
          <Link
            href="/"
            prefetch
            className="mr-2 flex w-full items-center justify-center md:w-auto lg:mr-6"
          >
            <LogoSquare />
            <div className="ml-2 flex-none text-sm font-medium uppercase md:hidden lg:block">
              {siteName}
            </div>
          </Link>
          {menu.length ? (
            <ul className="hidden gap-6 text-sm md:flex md:items-center">
              {menu.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.path}
                    prefetch
                    className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-neutral-300"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="hidden justify-center md:flex md:w-1/3">
          <Suspense fallback={<SearchSkeleton />}>
            <Search />
          </Suspense>
        </div>
        <div className="flex justify-end md:w-1/3">
          <Cart />
        </div>
      </div>
    </nav>
  );
}
