// components/product/gallery.tsx
'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactElement } from 'react';
import { GalleryMediaThumb, GalleryMediaViewer } from '@/components/product/gallery-media';
import type { Image as ProductImage } from '@/lib/shopify/types';
import { createUrl } from '@/lib/utils';

type Props = {
  images: ProductImage[];
};

export default function Gallery({ images }: Props): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageSearchParam = searchParams.get('image');
  const [imageIndex, setImageIndex] = useState(
    imageSearchParam ? Math.max(0, Math.min(images.length - 1, Number(imageSearchParam))) : 0,
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setImageIndex(
      imageSearchParam ? Math.max(0, Math.min(images.length - 1, Number(imageSearchParam))) : 0,
    );
  }, [imageSearchParam, images.length]);

  function buildUrl(nextIndex: number): string {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('image', nextIndex.toString());
    return createUrl('', newParams);
  }

  const nextImageIndex = imageIndex + 1 < images.length ? imageIndex + 1 : 0;
  const previousImageIndex = imageIndex === 0 ? images.length - 1 : imageIndex - 1;
  const buttonClassName =
    'h-full px-6 transition-all ease-in-out hover:scale-110 hover:text-black dark:hover:text-white flex items-center justify-center';

  const previewIndex = hoverIndex ?? imageIndex;
  const current = images[previewIndex];

  return (
    <form>
      <div className="relative aspect-square h-full max-h-[550px] w-full overflow-hidden">
        {current ? <GalleryMediaViewer item={current} priority /> : null}

        {images.length > 1 ? (
          <div className="absolute bottom-[15%] flex w-full justify-center">
            <div className="mx-auto flex h-11 items-center rounded-full border border-white bg-neutral-50/80 text-neutral-500 backdrop-blur dark:border-black dark:bg-neutral-900/80">
              <button
                formAction={() => {
                  router.replace(buildUrl(previousImageIndex), { scroll: false });
                }}
                aria-label="Mục gallery trước"
                className={buttonClassName}
              >
                <ArrowLeftIcon className="h-5" />
              </button>
              <div className="mx-1 h-6 w-px bg-neutral-500" />
              <button
                formAction={() => {
                  router.replace(buildUrl(nextImageIndex), { scroll: false });
                }}
                aria-label="Mục gallery sau"
                className={buttonClassName}
              >
                <ArrowRightIcon className="h-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul
          className="my-12 flex items-center flex-wrap justify-center gap-2 overflow-auto py-1 lg:mb-0"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {images.map((image, index) => {
            const isActive = index === previewIndex;
            return (
              <li key={image.url + index} className="h-20 w-20">
                <button
                  type="button"
                  aria-label={
                    image.kind === 'video' ? 'Xem video sản phẩm' : 'Xem ảnh sản phẩm'
                  }
                  aria-pressed={index === imageIndex}
                  className="h-full w-full"
                  onMouseEnter={() => setHoverIndex(index)}
                  onFocus={() => setHoverIndex(index)}
                  onBlur={() => setHoverIndex(null)}
                  onClick={() => {
                    setImageIndex(index);
                    router.replace(buildUrl(index), { scroll: false });
                  }}
                >
                  <GalleryMediaThumb item={image} active={isActive} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </form>
  );
}

export function ImageThumbHint({ active }: { active?: boolean }): ReactElement {
  return (
    <span
      className={clsx('inline-block', { 'opacity-70': active })}
      aria-hidden
    />
  );
}
