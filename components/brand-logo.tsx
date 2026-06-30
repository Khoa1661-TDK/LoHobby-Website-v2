// components/brand-logo.tsx — CMS-driven logo with env fallbacks
import clsx from 'clsx';
import Image from 'next/image';
import type { ReactElement } from 'react';
import type { StoreBranding } from '@/lib/store-branding';

type Props = {
  branding: StoreBranding;
  variant?: 'navbar' | 'full' | 'mark' | 'hero';
  className?: string;
};

function LogoImage({
  src,
  alt,
  width,
  height,
  className,
  style,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}): ReactElement {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority
      className={className}
      style={style}
    />
  );
}

export default function BrandLogo({
  branding,
  variant = 'navbar',
  className,
}: Props): ReactElement {
  const alt = branding.storeName;
  const { logoUrl, logoDarkUrl, tagline, origin, storeSubtitle, hasCustomLogo } =
    branding;

  // Lô Hobby default identity: a Playfair Display italic wordmark with an
  // uppercase tag. Used whenever no real logo image has been provided.
  if (!hasCustomLogo) {
    return <BrandWordmark branding={branding} variant={variant} className={className} />;
  }

  if (variant === 'mark' || variant === 'navbar') {
    const height = variant === 'mark' ? 44 : 52;
    const width = variant === 'mark' ? 72 : 88;
    const imageStyle = {
      height: variant === 'mark' ? 36 : 42,
      width: 'auto' as const,
      maxWidth: width,
    };

    const logo = logoDarkUrl ? (
      <>
        <LogoImage
          src={logoUrl}
          alt={alt}
          width={width}
          height={height}
          className="h-auto w-auto object-contain dark:hidden"
          style={imageStyle}
        />
        <LogoImage
          src={logoDarkUrl}
          alt={alt}
          width={width}
          height={height}
          className="hidden h-auto w-auto object-contain dark:inline-block"
          style={imageStyle}
        />
      </>
    ) : (
      <LogoImage
        src={logoUrl}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-auto object-contain dark:invert"
        style={imageStyle}
      />
    );

    if (variant === 'navbar' && storeSubtitle) {
      return (
        <span className={clsx('inline-flex shrink-0 flex-col items-start leading-tight', className)}>
          <span className="inline-flex items-center">{logo}</span>
          <span className="mt-0.5 text-[11px] font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
            {storeSubtitle}
          </span>
        </span>
      );
    }

    return (
      <span className={clsx('inline-flex shrink-0 items-center', className)}>{logo}</span>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={clsx('flex flex-col items-start', className)}>
        {logoDarkUrl ? (
          <>
            <LogoImage
              src={logoUrl}
              alt={alt}
              width={280}
              height={180}
              className="h-auto w-[min(280px,70vw)] object-contain dark:hidden"
            />
            <LogoImage
              src={logoDarkUrl}
              alt={alt}
              width={280}
              height={180}
              className="hidden h-auto w-[min(280px,70vw)] object-contain dark:block"
            />
          </>
        ) : (
          <LogoImage
            src={logoUrl}
            alt={alt}
            width={280}
            height={180}
            className="h-auto w-[min(280px,70vw)] object-contain dark:invert"
          />
        )}
        <p className="mt-4 max-w-md text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {tagline}
        </p>
        {origin ? (
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-400">
            {origin}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-start text-black dark:text-white', className)}>
      {logoDarkUrl ? (
        <>
          <LogoImage
            src={logoUrl}
            alt={alt}
            width={220}
            height={140}
            className="h-auto w-[min(220px,55vw)] object-contain dark:hidden"
          />
          <LogoImage
            src={logoDarkUrl}
            alt={alt}
            width={220}
            height={140}
            className="hidden h-auto w-[min(220px,55vw)] object-contain dark:block"
          />
        </>
      ) : (
        <LogoImage
          src={logoUrl}
          alt={alt}
          width={220}
          height={140}
          className="h-auto w-[min(220px,55vw)] object-contain dark:invert"
        />
      )}
      {storeSubtitle ? (
        <span className="mt-2 font-serif text-lg italic tracking-wide text-neutral-800 dark:text-neutral-200">
          {storeSubtitle}
        </span>
      ) : null}
      <p className="mt-3 max-w-xs text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {tagline}
      </p>
      {origin ? (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-400">
          {origin}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Text-only brand identity for the Lô Hobby system: a Playfair Display italic
 * wordmark (`font-logo`) paired with an uppercase "tag" line. Rendered whenever
 * no logo image has been uploaded so the storefront still has a distinctive,
 * on-brand mark instead of a generic placeholder.
 */
function BrandWordmark({
  branding,
  variant,
  className,
}: {
  branding: StoreBranding;
  variant: NonNullable<Props['variant']>;
  className?: string;
}): ReactElement {
  const { storeName, storeSubtitle, tagline, origin } = branding;
  const tag = storeSubtitle ?? origin;

  if (variant === 'navbar' || variant === 'mark') {
    return (
      <span className={clsx('inline-flex shrink-0 flex-col items-start leading-none', className)}>
        <span className="font-logo text-2xl font-semibold italic tracking-tight text-ink lg:text-[1.7rem]">
          {storeName}
        </span>
        {tag ? (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-accent-2">
            {tag}
          </span>
        ) : null}
      </span>
    );
  }

  const wordmarkSize = variant === 'hero' ? 'text-5xl lg:text-6xl' : 'text-4xl';

  return (
    <div className={clsx('flex flex-col items-start', className)}>
      <span className={clsx('font-logo font-semibold italic tracking-tight text-ink', wordmarkSize)}>
        {storeName}
      </span>
      {storeSubtitle ? (
        <span className="mt-2 text-sm font-semibold uppercase tracking-[0.32em] text-accent-2">
          {storeSubtitle}
        </span>
      ) : null}
      <p className="mt-3 max-w-md text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {tagline}
      </p>
      {origin ? (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-400">
          {origin}
        </p>
      ) : null}
    </div>
  );
}
