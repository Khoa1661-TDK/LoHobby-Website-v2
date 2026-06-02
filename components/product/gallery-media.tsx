// components/product/gallery-media.tsx
'use client';

import { PlayIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import Image from 'next/image';
import type { ReactElement } from 'react';
import GridTileImage from '@/components/grid/tile';
import { toNextImageSrc, toVideoSrc } from '@/lib/product-image-snapshot';
import type { Image as ProductImage } from '@/lib/shopify/types';

export function isGalleryVideo(item: Pick<ProductImage, 'kind' | 'url'>): boolean {
  return item.kind === 'video';
}

type ViewerProps = {
  item: ProductImage;
  priority?: boolean;
  sizes?: string;
};

export function GalleryMediaViewer({
  item,
  priority = false,
  sizes = '(min-width: 1024px) 66vw, 100vw',
}: ViewerProps): ReactElement {
  if (isGalleryVideo(item)) {
    return (
      <video
        key={item.url}
        className="h-full w-full object-contain bg-black"
        src={toVideoSrc(item.url)}
        controls
        playsInline
        preload="metadata"
        aria-label={item.altText}
      />
    );
  }

  return (
    <Image
      key={item.url}
      className="img-fit transition-opacity duration-300 ease-out motion-reduce:transition-none"
      fill
      sizes={sizes}
      alt={item.altText}
      src={toNextImageSrc(item.url)}
      priority={priority}
    />
  );
}

type ThumbProps = {
  item: ProductImage;
  active?: boolean;
  width?: number;
  height?: number;
};

export function GalleryMediaThumb({
  item,
  active,
  width = 80,
  height = 80,
}: ThumbProps): ReactElement {
  if (isGalleryVideo(item)) {
    return (
      <div
        className={clsx(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border bg-neutral-900',
          active ? 'border-2 border-terracotta-500' : 'border-warm-200/80 dark:border-warm-800/60',
        )}
      >
        <video
          className="h-full w-full object-cover opacity-80"
          src={toVideoSrc(item.url)}
          muted
          playsInline
          preload="metadata"
          aria-hidden
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
          <PlayIcon className="h-8 w-8 text-white drop-shadow" aria-hidden />
        </span>
      </div>
    );
  }

  return (
    <GridTileImage
      alt={item.altText}
      src={item.url}
      width={width}
      height={height}
      active={active}
    />
  );
}
