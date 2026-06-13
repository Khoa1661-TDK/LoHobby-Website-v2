'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
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
      className="group/carousel relative aspect-[16/10] w-full overflow-hidden rounded-3xl bg-warm-900 shadow-soft-lg sm:aspect-[21/9] sm:max-h-[460px]"
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
        className="flex h-full transition-transform duration-700 ease-smooth motion-reduce:transition-none"
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
              className="img-banner transition duration-1000 ease-smooth group-hover/slide:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/slide:scale-100"
            />
            {/* Warm gradient overlay */}
            <div className="absolute inset-0 overlay-warm transition-all duration-500 group-hover/slide:opacity-90" />

            {/* Editorial title treatment */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 md:p-8">
              <div className="flex items-end justify-between">
                <div className="max-w-lg">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-px w-8 bg-terracotta-400/80" />
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-warm-300">
                      Nổi bật
                    </span>
                  </div>
                  <p className="text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl lg:text-4xl transition duration-500 group-hover/slide:translate-x-1">
                    {slide.title}
                  </p>
                </div>
                <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm opacity-0 transition-all duration-300 group-hover/slide:opacity-100">
                  Xem chi tiết
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            </div>
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
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:bg-white/25 hover:scale-105 sm:left-5 sm:h-12 sm:w-12 sm:opacity-0 sm:group-hover/carousel:opacity-100 motion-reduce:transition-none motion-reduce:hover:scale-100"
            aria-label="Slide trước"
          >
            <ChevronLeftIcon className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              handleManualNav(goNext);
            }}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:bg-white/25 hover:scale-105 sm:right-5 sm:h-12 sm:w-12 sm:opacity-0 sm:group-hover/carousel:opacity-100 motion-reduce:transition-none motion-reduce:hover:scale-100"
            aria-label="Slide sau"
          >
            <ChevronRightIcon className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Refined dot indicators */}
          <div className="absolute bottom-5 right-5 z-10 flex items-center gap-2 sm:bottom-7 sm:right-7">
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
                  'rounded-full transition-all duration-500 ease-smooth',
                  dotIndex === index
                    ? 'h-2 w-8 bg-white shadow-glow'
                    : 'h-2 w-2 bg-white/35 hover:bg-white/60',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}