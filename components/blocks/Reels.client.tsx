// components/blocks/Reels.client.tsx — reels tile grid with a play-on-click
// modal. Handles iframe embeds (YouTube/TikTok) and direct <video> sources,
// falling back to the poster image when no embed URL is present.
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { PlayIcon, XMarkIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { Fragment, useState, type ReactElement } from 'react';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

export type ReelTile = {
  posterUrl: string | null;
  posterAlt: string;
  tag: string | null;
  caption: string | null;
  views: string | null;
  embedUrl: string | null;
};

type Props = { tiles: ReelTile[]; playLabel: string; closeLabel: string };

/** Turn a YouTube/TikTok watch URL into an embeddable form; pass others through. */
function toEmbedSrc(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;
  return url;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

export default function ReelsClient({ tiles, playLabel, closeLabel }: Props): ReactElement {
  const [active, setActive] = useState<ReelTile | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            onClick={() => tile.embedUrl && setActive(tile)}
            aria-label={tile.caption ? `${playLabel}: ${tile.caption}` : playLabel}
            className="group relative aspect-[9/16] overflow-hidden rounded-card bg-surface-raised text-left"
          >
            {tile.posterUrl ? (
              <Image
                src={toNextImageSrc(tile.posterUrl)}
                alt={tile.posterAlt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 20vw"
              />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {tile.embedUrl ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink shadow-sh-2 transition-transform duration-300 group-hover:scale-110">
                  <PlayIcon className="ml-0.5 h-5 w-5" />
                </span>
              </span>
            ) : null}
            {tile.tag ? (
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
                {tile.tag}
              </span>
            ) : null}
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
              {tile.caption ? (
                <span className="line-clamp-2 text-sm font-medium text-white">{tile.caption}</span>
              ) : null}
              {tile.views ? (
                <span className="text-[11px] text-white/70">{tile.views}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <ReelModal active={active} onClose={() => setActive(null)} closeLabel={closeLabel} />
    </>
  );
}

function ReelModal({
  active,
  onClose,
  closeLabel,
}: {
  active: ReelTile | null;
  onClose: () => void;
  closeLabel: string;
}): ReactElement {
  const url = active?.embedUrl ?? '';
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
              {url && isDirectVideo(url) ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={url} controls autoPlay className="h-full w-full object-contain" />
              ) : url ? (
                <iframe
                  src={toEmbedSrc(url)}
                  title={active?.caption ?? 'Reel'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : null}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
