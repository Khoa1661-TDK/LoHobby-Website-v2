// components/grid/tile.tsx
import clsx from 'clsx';
import Image from 'next/image';
import type { ComponentProps, ReactElement } from 'react';
import Label from '@/components/label';

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
        'group flex h-full w-full items-center justify-center overflow-hidden rounded-lg border bg-white hover:border-filament-400 dark:bg-black',
        {
          relative: label,
          'border-2 border-filament-500': active,
          'border-neutral-200 dark:border-neutral-800': !active,
        },
      )}
    >
      {props.src ? (
        <Image
          className={clsx('relative h-full w-full object-contain', {
            'transition duration-300 ease-in-out group-hover:scale-105': isInteractive,
          })}
          {...props}
          alt={props.alt}
          src={props.src}
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
