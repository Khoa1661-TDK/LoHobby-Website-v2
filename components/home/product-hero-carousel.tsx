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
  autoPlayMs = 4500,
}: Props): ReactElement | null {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoplayEpoch, setAutoplayEpoch] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => {
    setIndex((current) => (count === 0 ? 0 : (current + 1) % count));
  }, [count]);

  const goPrev = useCallback(() => {
    setIndex((current) => (count === 0 ? 0 : (current - 1 + count) % count));
  }, [count]);

  const restartAutoplay = useCallback(() => {
    setAutoplayEpoch((epoch) => epoch + 1);
  }, []);

  useEffect(() => {
    if (index >= count) {
      setIndex(0);
    }
  }, [count, index]);

  useEffect(() => {
    if (count <= 1 || paused) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return undefined;

    let timer: number | undefined;

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      timer = window.setInterval(goNext, autoPlayMs);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoPlayMs, autoplayEpoch, count, goNext, paused]);

  if (count === 0) return null;

  const handleManualNav = (action: () => void) => {
    action();
    restartAutoplay();
  };

  return (
    <div
      className="group/carousel relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-900 sm:aspect-[21/9] sm:max-h-[420px] md:max-h-[460px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < 40) return;
        if (delta < 0) handleManualNav(goNext);
        else handleManualNav(goPrev);
      }}
      aria-roledescription="carousel"
      aria-label="Sản phẩm mới nổi bật"
      aria-live="polite"
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
            className="group/slide relative h-full w-full shrink-0 overflow-hidden"
            aria-hidden={slideIndex !== index}
            tabIndex={slideIndex === index ? 0 : -1}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              priority={slideIndex === 0}
              sizes="100vw"
              className="img-banner transition duration-700 ease-out group-hover/slide:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/slide:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-all duration-500 group-hover/slide:from-black/90 group-hover/slide:via-black/30" />

            <p className="absolute bottom-5 left-5 max-w-[min(52%,20rem)] text-lg font-bold leading-snug text-white transition duration-300 group-hover/slide:translate-x-1 sm:bottom-6 sm:left-6 sm:max-w-md sm:text-2xl md:text-3xl">
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
              handleManualNav(goPrev);
            }}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/55 hover:scale-105 sm:left-4 sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover/carousel:opacity-100 motion-reduce:transition-none motion-reduce:hover:scale-100"
            aria-label="Slide trước"
          >
            <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              handleManualNav(goNext);
            }}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-100 backdrop-blur-sm transition hover:bg-black/55 hover:scale-105 sm:right-4 sm:h-11 sm:w-11 sm:opacity-0 sm:group-hover/carousel:opacity-100 motion-reduce:transition-none motion-reduce:hover:scale-100"
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
                  handleManualNav(() => goTo(dotIndex));
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
