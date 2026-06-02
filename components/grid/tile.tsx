// components/grid/tile.tsx
import clsx from 'clsx';
import Image from 'next/image';
import type { ComponentProps, ReactElement } from 'react';
import Label from '@/components/label';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

type Props = {
  isInteractive?: boolean;
  active?: boolean;
  label?: {
    title: string;
    amount: string;
    currencyCode: string;
    position?: 'bottom' | 'center';
  };
} & Omit<ComponentProps<typeof Image>, 'src' | 'alt'> & {
    src: string;
    alt: string;
  };

export default function GridTileImage({
  isInteractive = true,
  active,
  label,
  ...props
}: Props): ReactElement {
  return (
    <div
      className={clsx(
        'group relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:border-terracotta-300 dark:bg-warm-900',
        {
          'border-2 border-terracotta-500': active,
          'border-warm-200/80 dark:border-warm-800/60': !active,
        },
      )}
    >
      {props.src ? (
        <Image
          className={clsx('img-fit', {
            'transition duration-500 ease-smooth group-hover:scale-105': isInteractive,
          })}
          {...props}
          alt={props.alt}
          src={toNextImageSrc(props.src)}
        />
      ) : null}
      {label ? (
        <Label
          title={label.title}
          amount={label.amount}
          currencyCode={label.currencyCode}
          position={label.position}
        />
      ) : null}
    </div>
  );
}