// components/layout/navbar/index.tsx
import Link from 'next/link';
import { Suspense, type ReactElement } from 'react';
import BrandLogo from '@/components/brand-logo';
import HoverDropdown from '@/components/layout/navbar/hover-dropdown';
import Cart from '@/components/cart';
import { AuthNav } from '@/components/layout/navbar/auth-nav';
import MobileMenu from '@/components/layout/navbar/mobile-menu';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';
import ThemeToggle from '@/components/theme-toggle';
import { getStoreBranding } from '@/lib/store-branding';
import { getSiteHeaderTabs } from '@/lib/site-header';

export async function Navbar(): Promise<ReactElement> {
  const [tabs, branding] = await Promise.all([getSiteHeaderTabs(), getStoreBranding()]);

  return (
    <nav className="relative border-b border-neutral-100 dark:border-neutral-900">
      <div className="flex items-center justify-between p-4 lg:px-6">
      <div className="block flex-none md:hidden">
        <Suspense fallback={null}>
          <MobileMenu tabs={tabs} />
        </Suspense>
      </div>
      <div className="flex w-full items-center">
        <div className="flex w-full md:w-1/3">
          <Link
            href="/"
            prefetch
            className="mr-2 flex w-full items-center justify-center gap-2.5 md:w-auto lg:mr-6"
            aria-label={`${branding.storeName} — trang chủ`}
          >
            <BrandLogo branding={branding} variant="navbar" />
          </Link>
          {tabs.length ? (
            <ul className="hidden items-center gap-6 text-sm md:flex">
              {tabs.map((tab, tabIndex) => (
                <li key={`${tab.kind}:${tab.label}:${tabIndex}`}>
                  {tab.kind === 'link' ? (
                    <Link
                      href={tab.href}
                      prefetch={!tab.external}
                      target={tab.external ? '_blank' : undefined}
                      rel={tab.external ? 'noreferrer noopener' : undefined}
                      className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-white"
                    >
                      {tab.label}
                    </Link>
                  ) : (
                    <HoverDropdown label={tab.label} items={tab.items} />
                  )}
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
        <div className="flex items-center justify-end gap-3 md:w-1/3">
          <ThemeToggle />
          <AuthNav />
          <Cart />
        </div>
      </div>
      </div>
      <div className="border-t border-neutral-100 px-4 pb-3 pt-3 md:hidden dark:border-neutral-900">
        <Suspense fallback={<SearchSkeleton />}>
          <Search />
        </Suspense>
      </div>
    </nav>
  );
}
