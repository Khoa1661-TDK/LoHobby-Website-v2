// components/blocks/ReelCarousel.client.tsx — horizontal, arrow-navigated reel
// track with a click-to-play modal. The track scrolls by a page of tiles; arrows
// enable/disable at the ends. The modal loads the platform-specific embed
// (YouTube /embed, TikTok /embed/v2, Facebook plugins/video) only on open, so no
// third-party player scripts load until a shopper actually plays a reel.
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { PlayIcon, XMarkIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import { toReelEmbedSrc, type ReelPlatform } from '@/lib/reel-embed';

export type { ReelPlatform };

export type CarouselReel = {
  platform: ReelPlatform;
  url: string;
  posterUrl: string | null;
  posterAlt: string;
  caption: string | null;
  views: string | null;
};

type Props = { reels: CarouselReel[]; playLabel: string; closeLabel: string };

export default function ReelCarousel({ reels, playLabel, closeLabel }: Props): ReactElement {
  const [active, setActive] = useState<CarouselReel | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Recompute arrow enabled-state from the track's scroll position.
  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges, reels.length]);

  // Scroll by roughly one viewport of tiles in the given direction.
  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  }, []);

  if (reels.length === 0) return <></>;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reels.map((reel, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(reel)}
            aria-label={reel.caption ? `${playLabel}: ${reel.caption}` : playLabel}
            className="group relative aspect-[9/16] w-40 shrink-0 snap-start overflow-hidden rounded-card bg-surface-raised text-left sm:w-48 md:w-52"
          >
            {reel.posterUrl ? (
              <Image
                src={toNextImageSrc(reel.posterUrl)}
                alt={reel.posterAlt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 40vw, 208px"
              />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink shadow-sh-2 transition-transform duration-300 group-hover:scale-110">
                <PlayIcon className="ml-0.5 h-5 w-5" />
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
              {reel.caption ? (
                <span className="line-clamp-2 text-sm font-medium text-white">{reel.caption}</span>
              ) : null}
              {reel.views ? <span className="text-[11px] text-white/70">{reel.views}</span> : null}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        disabled={atStart}
        aria-label="Previous reels"
        className="absolute -left-3 top-[calc(50%-0.5rem)] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink shadow-sh-2 transition-opacity hover:bg-ink hover:text-surface disabled:pointer-events-none disabled:opacity-0"
      >
        <span aria-hidden className="text-lg leading-none">‹</span>
      </button>
      <button
        type="button"
        onClick={() => scrollByPage(1)}
        disabled={atEnd}
        aria-label="Next reels"
        className="absolute -right-3 top-[calc(50%-0.5rem)] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink shadow-sh-2 transition-opacity hover:bg-ink hover:text-surface disabled:pointer-events-none disabled:opacity-0"
      >
        <span aria-hidden className="text-lg leading-none">›</span>
      </button>

      <ReelModal active={active} onClose={() => setActive(null)} closeLabel={closeLabel} />
    </div>
  );
}

function ReelModal({
  active,
  onClose,
  closeLabel,
}: {
  active: CarouselReel | null;
  onClose: () => void;
  closeLabel: string;
}): ReactElement {
  const src = active ? toReelEmbedSrc(active.platform, active.url) : null;
  return (
    <Transition show={active !== null} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-card bg-black shadow-sh-3">
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink transition-transform hover:scale-110"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              {src ? (
                <iframe
                  src={src}
                  title={active?.caption ?? 'Reel'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/70">
                  This reel can’t be played here.
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
