// components/blocks/SpotlightCarousel.client.tsx — client carousel shell for the
// Spotlight deal block. The server renders one fully-formed slide per deal (image,
// price, per-deal countdown island) and hands them in as `slides`; this component
// only owns the interaction: a translateX track, auto-advance on an editor-set timer,
// prev/next arrows and dot indicators. With a single deal it renders the slide bare —
// no track, no controls, no autoplay.
'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

type Props = {
  slides: ReactNode[];
  autoplay: boolean;
  autoplaySeconds: number;
  /** Fixed dark banner (default) vs. a themed light/custom appearance. Drives control colors. */
  onDark: boolean;
};

const clampInterval = (seconds: number): number =>
  Math.min(30, Math.max(2, Number.isFinite(seconds) ? seconds : 6)) * 1000;

export default function SpotlightCarousel({
  slides,
  autoplay,
  autoplaySeconds,
  onDark,
}: Props): ReactNode {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Auto-advance. Skipped for a single slide, when the editor disabled autoplay, while
  // the shopper is hovering/focusing the carousel, or when the OS asks for reduced motion.
  useEffect(() => {
    if (count <= 1 || !autoplay || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const id = setInterval(() => setIndex((i) => (i + 1) % count), clampInterval(autoplaySeconds));
    return () => clearInterval(id);
  }, [count, autoplay, paused, autoplaySeconds]);

  // Keep the active index valid if the number of slides shrinks between renders.
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  if (count === 0) return null;
  if (count === 1) return slides[0];

  // Controls sit on top of the banner, so they must contrast with it: light chrome on
  // the fixed dark banner, ink chrome on a light/custom appearance.
  const arrowClass = onDark
    ? 'bg-white/10 text-white hover:bg-white/20'
    : 'bg-ink/5 text-ink hover:bg-ink/10';
  const dotOn = onDark ? 'bg-white' : 'bg-ink';
  const dotOff = onDark ? 'bg-white/30 hover:bg-white/50' : 'bg-ink/20 hover:bg-ink/40';

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Deal carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="w-full shrink-0 basis-full"
              role="group"
              aria-roledescription="slide"
              aria-label={`Deal ${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={prev}
        aria-label="Previous deal"
        className={`absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition-colors ${arrowClass}`}
      >
        <span aria-hidden className="text-lg leading-none">‹</span>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next deal"
        className={`absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition-colors ${arrowClass}`}
      >
        <span aria-hidden className="text-lg leading-none">›</span>
      </button>

      <div className="mt-6 flex items-center justify-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to deal ${i + 1}`}
            aria-current={i === index}
            className={`h-2.5 rounded-full transition-all ${
              i === index ? `w-6 ${dotOn}` : `w-2.5 ${dotOff}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}
