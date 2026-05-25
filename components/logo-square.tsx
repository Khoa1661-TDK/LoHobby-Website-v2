// components/logo-square.tsx — PolyToys filament-spool mark
import clsx from 'clsx';
import type { ReactElement } from 'react';

type Props = { size?: 'sm' | undefined };

export default function LogoSquare({ size }: Props): ReactElement {
  return (
    <div
      className={clsx(
        'flex flex-none items-center justify-center border border-filament-200 bg-filament-50 text-filament-600 dark:border-filament-700 dark:bg-filament-900 dark:text-filament-200',
        {
          'h-[40px] w-[40px] rounded-xl': !size,
          'h-[30px] w-[30px] rounded-lg': size === 'sm',
        },
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        className={clsx('h-[20px] w-[20px]', { 'h-[14px] w-[14px]': size === 'sm' })}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Filament spool */}
        <circle cx="16" cy="16" r="11" />
        <circle cx="16" cy="16" r="4" />
        {/* Filament strand spooling out */}
        <path d="M27 16c0-1.5-2 0-4 0s-3.5-1.5-3.5-3" />
      </svg>
    </div>
  );
}
