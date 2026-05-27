'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';

export type HeroSlide = {
  handle: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
};

type Props = {
  slides: HeroSlide[];
  autoPlayMs?: number;
};

export default function ProductHeroCarousel({
  slides,
  autoPlayMs = 5000,
}: Props): ReactElement | null {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (count <= 1 || paused) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;

    const timer = window.setInterval(goNext, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [autoPlayMs, count, goNext, paused]);

  if (count === 0) return null;

  return (
    <div
      className="group relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-900 sm:aspect-[21/9] sm:max-h-[420px] md:max-h-[460px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < 40) return;
        if (delta < 0) goNext();
        else goPrev();
      }}
      aria-roledescription="carousel"
      aria-label="Sản phẩm mới nổi bật"
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, slideIndex) => (
          <Link
            key={slide.handle}
            href={`/product/${slide.handle}`}
            prefetch
            className="relative h-full w-full shrink-0"
            aria-hidden={slideIndex !== index}
            tabIndex={slideIndex === index ? 0 : -1}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              priority={slideIndex === 0}
              sizes="100vw"
              className="object-contain p-6 sm:p-10"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            <p className="absolute bottom-5 left-5 max-w-[min(52%,20rem)] text-lg font-bold leading-snug text-white sm:bottom-6 sm:left-6 sm:max-w-md sm:text-2xl md:text-3xl">
              {slide.title}
            </p>
          </Link>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              goPrev();
            }}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 sm:left-4 sm:h-11 sm:w-11"
            aria-label="Slide trước"
          >
            <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 sm:right-4 sm:h-11 sm:w-11"
            aria-label="Slide sau"
          >
            <ChevronRightIcon className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-5">
            {slides.map((slide, dotIndex) => (
              <button
                key={slide.handle}
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  goTo(dotIndex);
                }}
                aria-label={`Slide ${dotIndex + 1}: ${slide.title}`}
                aria-current={dotIndex === index ? 'true' : undefined}
                className={clsx(
                  'h-2 rounded-full transition-all duration-300',
                  dotIndex === index
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/45 hover:bg-white/70',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
