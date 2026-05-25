// components/loading-dots.tsx
import clsx from 'clsx';
import type { ReactElement } from 'react';

type Props = { className?: string };

export default function LoadingDots({ className }: Props): ReactElement {
  return (
    <span className="mx-2 inline-flex items-center">
      <span className={clsx('mx-[1px] inline-block h-1 w-1 animate-blink rounded-md', className)} />
      <span
        className={clsx(
          'mx-[1px] inline-block h-1 w-1 animate-blink rounded-md [animation-delay:200ms]',
          className,
        )}
      />
      <span
        className={clsx(
          'mx-[1px] inline-block h-1 w-1 animate-blink rounded-md [animation-delay:400ms]',
          className,
        )}
      />
    </span>
  );
}
