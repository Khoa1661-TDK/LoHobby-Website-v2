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
          'inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200',
          open || isActive
            ? 'bg-warm-100/80 text-warm-900 dark:bg-warm-800/50 dark:text-warm-100'
            : 'text-warm-600 hover:bg-warm-100/80 hover:text-warm-900 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-100',
        )}
      >
        {label}
        <ChevronDownIcon
          className={clsx(
            'h-3.5 w-3.5 transition-transform duration-300 ease-smooth',
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
          className="overflow-hidden rounded-xl border border-warm-200/80 bg-white py-1.5 shadow-soft-xl dark:border-warm-800/60 dark:bg-warm-900"
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
                      'block border-l-2 px-4 py-2.5 text-sm transition-all duration-200 ease-smooth',
                      'text-warm-600 hover:translate-x-1 hover:border-terracotta-400 hover:bg-warm-50 hover:text-warm-900 dark:text-warm-300 dark:hover:bg-warm-800/50 dark:hover:text-warm-100',
                      itemActive &&
                        'border-l-2 border-terracotta-500 bg-terracotta-50 font-medium text-terracotta-700 dark:bg-terracotta-950/40 dark:text-terracotta-300',
                      !itemActive && 'border-transparent',
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