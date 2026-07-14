// components/blocks/YouTubeChannel.tsx — server block rendering a YouTube channel
// card with live subscriber / view / video counts (lib/youtube-stats.ts). Falls
// back to editor-entered manual values when the Data API key is unset or the
// lookup fails, so the block always renders something meaningful.
import Image from 'next/image';
import type { ReactElement } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import { SocialIcon } from '@/components/social/SocialIcon';
import { formatCompactCount, getYouTubeChannelStats } from '@/lib/youtube-stats';

type Props = {
  eyebrow?: string | null;
  heading?: string | null;
  channelIdentifier?: string | null;
  channelUrl?: string | null;
  subscribeLabel?: string | null;
  showSubscribers?: boolean | null;
  showViews?: boolean | null;
  showVideos?: boolean | null;
  manualName?: string | null;
  manualAvatar?: { url?: string; alt?: string } | null;
  manualSubscribers?: string | null;
  manualViews?: string | null;
  manualVideos?: string | null;
} & BlockAppearance;

type StatItem = { value: string; label: string };

export default async function YouTubeChannelBlock(props: Props): Promise<ReactElement | null> {
  const {
    eyebrow,
    heading,
    channelIdentifier,
    channelUrl,
    subscribeLabel,
    showSubscribers = true,
    showViews = true,
    showVideos = false,
    manualName,
    manualAvatar,
    manualSubscribers,
    manualViews,
    manualVideos,
  } = props;

  const { section, container, style } = blockAppearanceClasses(props);
  const [t, locale] = await Promise.all([getTranslations('youtube'), getLocale()]);

  const identifier = channelIdentifier?.trim() ?? '';
  const stats = identifier ? await getYouTubeChannelStats(identifier) : null;

  // Live values win; each falls back to the editor's manual entry, then to nothing.
  const name = stats?.title?.trim() || manualName?.trim() || '';
  const avatarUrl = stats?.avatarUrl || manualAvatar?.url || null;
  const avatarAlt = manualAvatar?.alt || name || 'YouTube channel';

  const subsValue =
    stats && !stats.subscriberHidden && stats.subscriberCount != null
      ? formatCompactCount(stats.subscriberCount, locale)
      : manualSubscribers?.trim() || null;
  const viewsValue =
    stats?.viewCount != null
      ? formatCompactCount(stats.viewCount, locale)
      : manualViews?.trim() || null;
  const videosValue =
    stats?.videoCount != null
      ? formatCompactCount(stats.videoCount, locale)
      : manualVideos?.trim() || null;

  const items: StatItem[] = [];
  if (showSubscribers !== false && subsValue) {
    items.push({ value: subsValue, label: t('subscribers') });
  }
  if (showViews !== false && viewsValue) {
    items.push({ value: viewsValue, label: t('views') });
  }
  if (showVideos && videosValue) {
    items.push({ value: videosValue, label: t('videos') });
  }

  // Nothing resolved and no name to show — render nothing rather than an empty shell.
  if (!name && items.length === 0) return null;

  // Prefer the editor's explicit link; otherwise deep-link to the resolved channel.
  const href =
    channelUrl?.trim() ||
    (stats?.channelId ? `https://www.youtube.com/channel/${stats.channelId}` : null) ||
    (identifier.startsWith('@') ? `https://www.youtube.com/${identifier}` : null);

  return (
    <section className={section} style={style}>
      <div className={container}>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {heading}
          </h2>
        ) : null}

        <div className="flex flex-col items-center gap-6 rounded-card border border-line bg-surface-raised p-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            {avatarUrl ? (
              <Image
                src={toNextImageSrc(avatarUrl)}
                alt={avatarAlt}
                width={88}
                height={88}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-line"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#FF0000] text-white">
                <SocialIcon platform="youtube" className="h-9 w-9 fill-current" />
              </span>
            )}
            <div>
              {name ? (
                <p className="font-display text-xl font-bold tracking-tight text-ink">{name}</p>
              ) : null}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FF0000] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <SocialIcon platform="youtube" className="h-4 w-4 fill-current" />
                  {subscribeLabel?.trim() || t('subscribe')}
                </a>
              ) : null}
            </div>
          </div>

          {items.length > 0 ? (
            <dl className="flex items-center gap-8">
              {items.map((item, i) => (
                <div key={i} className="text-center">
                  <dt className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                    {item.value}
                  </dt>
                  <dd className="mt-1 text-xs uppercase tracking-wide text-ink/60">{item.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
