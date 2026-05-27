// components/layout/navbar/index.tsx
import Link from 'next/link';
import { Suspense, type ReactElement } from 'react';
import BrandLogo from '@/components/brand-logo';
import CategoriesDropdown from '@/components/layout/navbar/categories-dropdown';
import { getCollections } from '@/lib/shopify';
import type { Menu } from '@/lib/shopify/types';
import Cart from '@/components/cart';
import { AuthNav } from '@/components/layout/navbar/auth-nav';
import MobileMenu from '@/components/layout/navbar/mobile-menu';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';

const HEADER_MENU: Menu[] = [
  { title: 'Trang chủ', path: '/' },
  { title: 'Cửa hàng', path: '/search' },
];

export async function Navbar(): Promise<ReactElement> {
  const collections = await getCollections();
  const menu = HEADER_MENU;

  const categoryItems = collections
    .filter((collection) => collection.handle !== '')
    .map((collection) => ({
      title: collection.title,
      path: `/search/${collection.handle}`,
    }));

  return (
    <nav className="relative flex items-center justify-between border-b border-neutral-100 p-4 lg:px-6 dark:border-neutral-900">
      <div className="block flex-none md:hidden">
        <Suspense fallback={null}>
          <MobileMenu menu={menu} categories={categoryItems} />
        </Suspense>
      </div>
      <div className="flex w-full items-center">
        <div className="flex w-full md:w-1/3">
          <Link
            href="/"
            prefetch
            className="mr-2 flex w-full items-center justify-center gap-2.5 md:w-auto lg:mr-6"
            aria-label="Lô Hobby — trang chủ"
          >
            <BrandLogo variant="navbar" />
          </Link>
          {menu.length ? (
            <ul className="hidden items-center gap-6 text-sm md:flex">
              {menu.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.path}
                    prefetch
                    className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
              <li>
                <CategoriesDropdown items={categoryItems} />
              </li>
            </ul>
          ) : null}
        </div>
        <div className="hidden justify-center md:flex md:w-1/3">
          <Suspense fallback={<SearchSkeleton />}>
            <Search />
          </Suspense>
        </div>
        <div className="flex items-center justify-end gap-3 md:w-1/3">
          <AuthNav />
          <Cart />
        </div>
      </div>
    </nav>
  );
}
