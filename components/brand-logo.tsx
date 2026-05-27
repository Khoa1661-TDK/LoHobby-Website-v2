// components/brand-logo.tsx — Lô mark (upscaled PNG + typographic fallbacks)
import clsx from 'clsx';
import Image from 'next/image';
import type { ReactElement } from 'react';
import { BRAND_ORIGIN, BRAND_TAGLINE } from '@/lib/brand';

type Props = {
  variant?: 'navbar' | 'full' | 'mark' | 'hero';
  className?: string;
};

const LOGO_SRC = '/brand/lo-logo.png';

export default function BrandLogo({
  variant = 'navbar',
  className,
}: Props): ReactElement {
  if (variant === 'mark' || variant === 'navbar') {
    const height = variant === 'mark' ? 44 : 52;
    const width = variant === 'mark' ? 72 : 88;

    return (
      <Image
        src={LOGO_SRC}
        alt="Lô"
        width={width}
        height={height}
        priority
        className={clsx('h-auto w-auto shrink-0 object-contain dark:invert', className)}
        style={{ height: variant === 'mark' ? 36 : 42, width: 'auto', maxWidth: width }}
      />
    );
  }

  if (variant === 'hero') {
    return (
      <div className={clsx('flex flex-col items-start', className)}>
        <Image
          src={LOGO_SRC}
          alt="Lô"
          width={280}
          height={180}
          priority
          className="h-auto w-[min(280px,70vw)] object-contain dark:invert"
        />
        <p className="mt-4 max-w-md text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {BRAND_TAGLINE}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-400">
          {BRAND_ORIGIN}
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-start text-black dark:text-white', className)}>
      <Image
        src={LOGO_SRC}
        alt="Lô"
        width={220}
        height={140}
        priority
        className="h-auto w-[min(220px,55vw)] object-contain dark:invert"
      />
      <span className="mt-2 font-serif text-lg italic tracking-wide text-neutral-800 dark:text-neutral-200">
        Mô Hình Hobby
      </span>
      <p className="mt-3 max-w-xs text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {BRAND_TAGLINE}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-400">
        {BRAND_ORIGIN}
      </p>
    </div>
  );
}
