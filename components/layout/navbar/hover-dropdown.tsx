// components/layout/navbar/hover-dropdown.tsx
'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactElement } from 'react';

export type HoverDropdownItem = { label: string; href: string };

type Props = {
  label: string;
  items: HoverDropdownItem[];
  /** Delay before closing on mouseleave so users can move from button to panel. */
  closeDelayMs?: number;
};

export default function HoverDropdown({
  label,
  items,
  closeDelayMs = 200,
}: Props): ReactElement | null {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openEpoch, setOpenEpoch] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const cancelClose = (): void => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (): void => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelayMs);
  };

  const openMenu = (): void => {
    cancelClose();
    setOpen((wasOpen) => {
      if (!wasOpen) setOpenEpoch((epoch) => epoch + 1);
      return true;
    });
  };

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => () => cancelClose(), []);

  if (!items.length) return null;

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((wasOpen) => {
            if (wasOpen) return false;
            setOpenEpoch((epoch) => epoch + 1);
            return true;
          });
        }}
        className={clsx(
          'flex items-center gap-1 text-sm underline-offset-4 transition-colors duration-200 hover:underline focus:outline-none focus-visible:underline',
          open || isActive
            ? 'text-black dark:text-white'
            : 'text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white',
        )}
      >
        {label}
        <ChevronDownIcon
          className={clsx(
            'h-3.5 w-3.5 transition-transform duration-300 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        className="nav-dropdown-panel absolute left-0 top-full z-50 w-64 pt-2"
      >
        <div
          role="menu"
          aria-label={label}
          className="overflow-hidden rounded-xl border border-neutral-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-white/10"
        >
          <ul
            key={openEpoch}
            className="max-h-80 overflow-y-auto [scrollbar-width:thin]"
          >
            {items.map((item, itemIndex) => {
              const itemActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li
                  key={item.href}
                  className="nav-dropdown-item"
                  style={{ animationDelay: `${Math.min(itemIndex * 45, 540)}ms` }}
                >
                  <Link
                    href={item.href}
                    prefetch
                    role="menuitem"
                    tabIndex={open ? 0 : -1}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'block border-l-2 border-transparent px-4 py-2.5 text-sm transition-all duration-200 ease-out',
                      'text-neutral-600 hover:translate-x-1 hover:border-red-500 hover:bg-neutral-50 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white',
                      itemActive &&
                        'border-red-500 bg-neutral-50 font-medium text-black dark:bg-neutral-900 dark:text-white',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
