import type { ReactElement } from 'react';

type Props = {
  rating: number;
  className?: string;
  size?: 'sm' | 'md';
};

/** Static star rating display (rounds to the nearest half is not supported; uses full-star fill). */
export default function Stars({ rating, className, size = 'sm' }: Props): ReactElement {
  const dimension = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className ?? ''}`}
      role="img"
      aria-label={`${rating} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          aria-hidden
          className={`${dimension} ${
            index <= Math.round(rating)
              ? 'text-amber-400'
              : 'text-neutral-300 dark:text-neutral-600'
          }`}
          fill="currentColor"
        >
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}
