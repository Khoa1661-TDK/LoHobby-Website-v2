// components/layout/navbar/mobile-menu.tsx
'use client';

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Bars3Icon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment, Suspense, useEffect, useState, type ReactElement } from 'react';
import LanguageSwitcher from '@/components/layout/navbar/language-switcher';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';
import type { NavColumn } from '@/lib/navigation';

export default function MobileMenu({
  columns,
}: {
  columns: NavColumn[];
}): ReactElement {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const openMobileMenu = (): void => setIsOpen(true);
  const closeMobileMenu = (): void => {
    setIsOpen(false);
    setOpenSection(null);
  };

  useEffect(() => {
    closeMobileMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <>
      <button
        onClick={openMobileMenu}
        aria-label={t('openMenu')}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-warm-200/80 text-warm-700 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-300 dark:hover:bg-warm-800/50 dark:hover:text-warm-100"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={closeMobileMenu} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-warm-950/40 backdrop-blur-sm" aria-hidden="true" />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition-all ease-smooth duration-400"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-all ease-smooth duration-250"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel className="fixed bottom-0 left-0 top-0 flex h-full w-full max-w-sm flex-col bg-warm-50 shadow-soft-xl dark:bg-warm-950">
              <div className="flex items-center justify-between border-b border-warm-200/60 p-4 dark:border-warm-800/40">
                <p className="text-sm font-semibold uppercase tracking-widest text-warm-400">{t('menu')}</p>
                <button
                  onClick={closeMobileMenu}
                  aria-label={t('closeMenu')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-warm-200/80 text-warm-600 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-5 w-full">
                  <Suspense fallback={<SearchSkeleton />}>
                    <Search />
                  </Suspense>
                </div>
                <ul className="flex w-full flex-col">
                  {columns.map((column, columnIndex) => {
                    const sectionKey = `${column.heading}:${columnIndex}`;
                    const expanded = openSection === sectionKey;

                    return (
                      <li
                        key={sectionKey}
                        className="border-t border-warm-200/40 first:border-t-0 dark:border-warm-800/30"
                      >
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setOpenSection((prev) => (prev === sectionKey ? null : sectionKey))
                          }
                          className="flex w-full items-center justify-between py-3.5 text-lg font-medium text-warm-800 transition-colors hover:text-warm-950 dark:text-warm-200 dark:hover:text-white"
                        >
                          {column.heading}
                          <ChevronDownIcon
                            className={clsx(
                              'h-5 w-5 text-warm-400 transition-transform duration-300 ease-smooth',
                              expanded && 'rotate-180',
                            )}
                          />
                        </button>
                        <div
                          className={clsx(
                            'grid transition-[grid-template-rows,opacity] duration-300 ease-smooth motion-reduce:transition-none',
                            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                          )}
                        >
                          <div className="overflow-hidden">
                            <ul className="mb-3 ml-3 space-y-1">
                              {column.links.map((link, linkIndex) => (
                                <li key={`${link.label}:${link.href}`}>
                                  <Link
                                    href={link.href}
                                    prefetch={!link.external}
                                    target={link.external ? '_blank' : undefined}
                                    rel={link.external ? 'noreferrer noopener' : undefined}
                                    onClick={closeMobileMenu}
                                    className="flex items-center gap-3 py-2.5 text-base text-warm-600 transition-all duration-200 hover:text-terracotta-600 dark:text-warm-400 dark:hover:text-terracotta-400"
                                    style={
                                      expanded
                                        ? { animationDelay: `${Math.min(linkIndex * 40, 400)}ms` }
                                        : undefined
                                    }
                                  >
                                    <span className="h-1 w-1 rounded-full bg-warm-300 dark:bg-warm-700" />
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  <li className="mt-3 border-t border-warm-200/40 pt-5 dark:border-warm-800/30">
                    <Link
                      href="/login"
                      prefetch
                      onClick={closeMobileMenu}
                      className="inline-flex items-center gap-2 rounded-xl border border-warm-200/80 px-5 py-2.5 text-sm font-medium text-warm-700 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-300 dark:hover:bg-warm-800/50 dark:hover:text-warm-100"
                    >
                      {t('login')}
                    </Link>
                  </li>
                  <li className="mt-5 border-t border-warm-200/40 pt-5 dark:border-warm-800/30">
                    <LanguageSwitcher variant="full" />
                  </li>
                </ul>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

export { SearchSkeleton };