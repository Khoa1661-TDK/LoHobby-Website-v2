// components/layout/navbar/mobile-menu.tsx
'use client';

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useState, type ReactElement } from 'react';
import type { Menu } from '@/lib/shopify/types';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';
import type { CategoryNavItem } from '@/components/layout/search/collections-nav';

export default function MobileMenu({
  menu,
  categories = [],
}: {
  menu: Menu[];
  categories?: CategoryNavItem[];
}): ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const openMobileMenu = (): void => setIsOpen(true);
  const closeMobileMenu = (): void => setIsOpen(false);

  useEffect(() => {
    setIsOpen(false);
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
                  <Search />
                </div>
                <ul className="flex w-full flex-col">
                  {menu.map((item) => (
                    <li
                      className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white"
                      key={item.title}
                    >
                      <Link href={item.path} prefetch onClick={closeMobileMenu}>
                        {item.title}
                      </Link>
                    </li>
                  ))}
                  {categories.length > 0 ? (
                    <li className="mt-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Danh mục
                      </p>
                      <ul className="max-h-56 space-y-1 overflow-y-auto [scrollbar-width:thin]">
                        {categories.map((item) => (
                          <li key={item.path}>
                            <Link
                              href={item.path}
                              prefetch
                              onClick={closeMobileMenu}
                              className="block py-1.5 text-base text-black transition-colors hover:text-neutral-500 dark:text-white"
                            >
                              {item.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : null}
                  <li className="py-2 text-xl text-black transition-colors hover:text-neutral-500 dark:text-white">
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
