// components/layout/navbar/index.tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Suspense, type ReactElement } from 'react';
import BrandLogo from '@/components/brand-logo';
import HoverDropdown from '@/components/layout/navbar/hover-dropdown';
import Cart from '@/components/cart';
import { AuthNav } from '@/components/layout/navbar/auth-nav';
import LanguageSwitcher from '@/components/layout/navbar/language-switcher';
import MobileMenu from '@/components/layout/navbar/mobile-menu';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';
import ThemeToggle from '@/components/theme-toggle';
import { getMobileMenu } from '@/lib/navigation';
import { getStoreBranding } from '@/lib/store-branding';
import { getSiteHeaderTabs } from '@/lib/site-header';

export async function Navbar(): Promise<ReactElement> {
  const [tabs, branding, mobileMenu, t] = await Promise.all([
    getSiteHeaderTabs(),
    getStoreBranding(),
    getMobileMenu(),
    getTranslations('nav'),
  ]);

  return (
    <nav className="sticky top-0 z-40 border-b border-warm-200/80 bg-warm-50/85 backdrop-blur-xl backdrop-saturate-150 dark:border-warm-800/50 dark:bg-warm-950/85">
      {/* Grain texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative flex items-center justify-between px-4 py-3 lg:px-6 lg:py-3.5">
        {/* Mobile menu trigger */}
        <div className="block flex-none md:hidden">
          <Suspense fallback={null}>
            <MobileMenu columns={mobileMenu} />
          </Suspense>
        </div>

        {/* Left: Logo + nav tabs */}
        <div className="flex w-full items-center gap-8">
          <div className="flex items-center md:w-auto">
            <Link
              href="/"
              prefetch
              className="mr-2 flex shrink-0 items-center gap-2.5 lg:mr-6"
              aria-label={t('homeAria', { store: branding.storeName })}
            >
              <BrandLogo branding={branding} variant="navbar" />
            </Link>
          </div>

          {tabs.length > 0 && (
            <ul className="hidden items-center gap-1 text-sm md:flex">
              {tabs.map((tab, tabIndex) => (
                <li key={`${tab.kind}:${tab.label}:${tabIndex}`}>
                  {tab.kind === 'link' ? (
                    <Link
                      href={tab.href}
                      prefetch={!tab.external}
                      target={tab.external ? '_blank' : undefined}
                      rel={tab.external ? 'noreferrer noopener' : undefined}
                      className="inline-flex rounded-pill px-3.5 py-2 text-sm font-medium text-warm-600 transition-colors duration-200 hover:bg-warm-100 hover:text-warm-900 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-100"
                    >
                      {tab.label}
                    </Link>
                  ) : (
                    <HoverDropdown label={tab.label} items={tab.items} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: search + actions */}
        <div className="flex items-center gap-2">
          {/* Desktop search */}
          <div className="hidden md:block md:w-52 lg:w-64 xl:w-72">
            <Suspense fallback={<SearchSkeleton />}>
              <Search />
            </Suspense>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden md:block">
              <Suspense fallback={<div className="h-10 w-12" aria-hidden />}>
                <LanguageSwitcher />
              </Suspense>
            </div>
            <ThemeToggle />
            <AuthNav />
            <Cart />
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="border-t border-warm-200/60 px-4 pb-3 pt-3 md:hidden dark:border-warm-800/40">
        <Suspense fallback={<SearchSkeleton />}>
          <Search />
        </Suspense>
      </div>
    </nav>
  );
}