// components/layout/navbar/mobile-menu.tsx
'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Bars3Icon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { animate } from 'motion';
import LanguageSwitcher from '@/components/layout/navbar/language-switcher';
import Search, { SearchSkeleton } from '@/components/layout/navbar/search';
import { prefersReducedMotion } from '@/lib/animations/config';
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
  // `mounted` keeps the Dialog in the DOM through the close animation; it flips
  // off only once the panel has finished sliding out.
  const [mounted, setMounted] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const openMobileMenu = (): void => {
    setMounted(true);
    setIsOpen(true);
  };
  const closeMobileMenu = (): void => {
    setIsOpen(false);
    setOpenSection(null);
  };

  useEffect(() => {
    closeMobileMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Drive the panel + backdrop with Motion One. Open → spring slide-in from the
  // left edge (x: -100%→0); close → ease the panel back out, then unmount.
  // Reduced motion: instant show/hide, no spring (spec §3).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    const reduced = prefersReducedMotion();

    if (isOpen) {
      if (reduced) {
        panel.style.transform = 'translateX(0)';
        backdrop.style.opacity = '1';
        return;
      }
      animate(backdrop, { opacity: [0, 1] }, { duration: 0.25, ease: 'easeOut' });
      animate(
        panel,
        { transform: ['translateX(-100%)', 'translateX(0)'] },
        { type: 'spring', stiffness: 260, damping: 30 },
      );
      return;
    }

    // Closing — skip the very first render (menu was never open).
    if (!mounted) return;
    if (reduced) {
      setMounted(false);
      return;
    }
    animate(backdrop, { opacity: [1, 0] }, { duration: 0.2, ease: 'easeIn' });
    const controls = animate(
      panel,
      { transform: ['translateX(0)', 'translateX(-100%)'] },
      { duration: 0.25, ease: [0.4, 0, 1, 1] },
    );
    controls.finished.then(() => setMounted(false)).catch(() => setMounted(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <>
      <button
        onClick={openMobileMenu}
        aria-label={t('openMenu')}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-warm-200/80 text-warm-700 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-300 dark:hover:bg-warm-800/50 dark:hover:text-warm-100"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      {mounted ? (
        <Dialog open onClose={closeMobileMenu} className="relative z-50">
          <div
            ref={backdropRef}
            className="fixed inset-0 bg-warm-950/40 backdrop-blur-sm"
            style={{ opacity: 0 }}
            aria-hidden="true"
          />
          <DialogPanel
            ref={panelRef}
            style={{ transform: 'translateX(-100%)' }}
            className="fixed bottom-0 left-0 top-0 flex h-full w-full max-w-sm flex-col bg-warm-50 shadow-soft-xl dark:bg-warm-950"
          >
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
        </Dialog>
      ) : null}
    </>
  );
}

export { SearchSkeleton };