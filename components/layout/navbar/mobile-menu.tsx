// components/layout/navbar/mobile-menu.tsx
'use client';

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Bars3Icon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment, Suspense, useEffect, useState, type ReactElement } from 'react';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';
import type { ResolvedHeaderTab } from '@/lib/site-header';

export default function MobileMenu({
  tabs,
}: {
  tabs: ResolvedHeaderTab[];
}): ReactElement {
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
        aria-label="Mở menu di động"
        className="flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:text-white md:hidden"
      >
        <Bars3Icon className="h-4" />
      </button>
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={closeMobileMenu} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 backdrop-blur-none"
            enterTo="opacity-100 backdrop-blur-[.5px]"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100 backdrop-blur-[.5px]"
            leaveTo="opacity-0 backdrop-blur-none"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="translate-x-[-100%]"
            enterTo="translate-x-0"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-[-100%]"
          >
            <DialogPanel className="fixed bottom-0 left-0 right-0 top-0 flex h-full w-full flex-col bg-white pb-6 dark:bg-black">
              <div className="p-4">
                <button
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:text-white"
                  onClick={closeMobileMenu}
                  aria-label="Đóng menu di động"
                >
                  <XMarkIcon className="h-6" />
                </button>
                <div className="mb-4 w-full">
                  <Suspense fallback={<SearchSkeleton />}>
                    <Search />
                  </Suspense>
                </div>
                <ul className="flex w-full flex-col">
                  {tabs.map((tab, tabIndex) => {
                    if (tab.kind === 'link') {
                      return (
                        <li
                          className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white"
                          key={`${tab.kind}:${tab.label}:${tabIndex}`}
                        >
                          <Link
                            href={tab.href}
                            prefetch={!tab.external}
                            target={tab.external ? '_blank' : undefined}
                            rel={tab.external ? 'noreferrer noopener' : undefined}
                            onClick={closeMobileMenu}
                          >
                            {tab.label}
                          </Link>
                        </li>
                      );
                    }

                    const sectionKey = `${tab.kind}:${tab.label}:${tabIndex}`;
                    const expanded = openSection === sectionKey;

                    return (
                      <li
                        key={sectionKey}
                        className="border-t border-neutral-200 first:border-t-0 dark:border-neutral-800"
                      >
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setOpenSection((prev) => (prev === sectionKey ? null : sectionKey))
                          }
                          className="flex w-full items-center justify-between py-3 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white"
                        >
                          {tab.label}
                          <ChevronDownIcon
                            className={clsx(
                              'h-5 w-5 transition-transform duration-300 ease-out motion-reduce:transition-none',
                              expanded && 'rotate-180',
                            )}
                          />
                        </button>
                        <div
                          className={clsx(
                            'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
                            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                          )}
                        >
                          <div className="overflow-hidden">
                            <ul className="mb-3 ml-2 max-h-72 space-y-1 overflow-y-auto [scrollbar-width:thin]">
                              {tab.items.map((item, itemIndex) => (
                                <li
                                  key={item.href}
                                  className={clsx(
                                    expanded && 'motion-reduce:animate-none animate-dropdown-item',
                                  )}
                                  style={
                                    expanded
                                      ? { animationDelay: `${Math.min(itemIndex * 35, 420)}ms` }
                                      : undefined
                                  }
                                >
                                  <Link
                                    href={item.href}
                                    prefetch
                                    onClick={closeMobileMenu}
                                    className="block border-l-2 border-transparent py-1.5 pl-2 text-base text-black transition-[background-color,border-color,padding-left,color] duration-200 hover:border-red-500 hover:pl-3 hover:text-neutral-600 dark:text-white dark:hover:text-neutral-300"
                                  >
                                    {item.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  <li className="mt-2 border-t border-neutral-200 py-2 pt-4 text-xl text-black transition-colors hover:text-neutral-500 dark:border-neutral-800 dark:text-white">
                    <Link href="/login" prefetch onClick={closeMobileMenu}>
                      Đăng nhập
                    </Link>
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
