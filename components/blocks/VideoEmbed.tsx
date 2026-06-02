// components/blocks/VideoEmbed.tsx
import Image from 'next/image';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  title?: string | null;
  url: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | null;
  coverImage?: { url?: string; alt?: string } | null;
} & BlockAppearance;

const ratioMap: Record<string, string> = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
};

export default function VideoEmbedBlock(props: Props): ReactElement {
  const { title, url, aspectRatio = '16/9', coverImage } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const ratioClass = ratioMap[aspectRatio ?? '16/9'] ?? 'aspect-video';

  const isYouTube =
    url.includes('youtube.com/embed') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo.com') || url.includes('player.vimeo.com');

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-6 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
        ) : null}
        <div
          className={`relative overflow-hidden rounded-2xl ${ratioClass} ${
            props.background === 'dark' ? 'bg-warm-800' : 'bg-warm-100'
          }`}
        >
          {coverImage?.url ? (
            <Image
              src={coverImage.url}
              alt={coverImage.alt ?? 'Video cover'}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          ) : null}
          <iframe
            src={url}
            title={title ?? 'Embedded video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}