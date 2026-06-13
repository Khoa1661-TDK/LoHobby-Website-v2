// components/layout/announcement-banner.tsx — CMS-managed bar below the navbar
import { Link } from '@/i18n/navigation';
import type { CSSProperties, ReactElement } from 'react';
import { getSiteAnnouncement } from '@/lib/site-header';

export default async function AnnouncementBanner(): Promise<ReactElement | null> {
  const announcement = await getSiteAnnouncement();
  if (!announcement) return null;

  const style: CSSProperties = {};
  if (announcement.backgroundColor) style.backgroundColor = announcement.backgroundColor;
  if (announcement.textColor) style.color = announcement.textColor;

  const hasCustomColors = Boolean(announcement.backgroundColor || announcement.textColor);

  const textClassName = announcement.href
    ? 'underline-offset-4 hover:underline transition-all duration-200'
    : undefined;

  const content = announcement.href ? (
    <Link
      href={announcement.href}
      prefetch={!announcement.external}
      target={announcement.external ? '_blank' : undefined}
      rel={announcement.external ? 'noreferrer noopener' : undefined}
      className={textClassName}
    >
      {announcement.text}
    </Link>
  ) : (
    announcement.text
  );

  return (
    <div
      role="status"
      className={
        hasCustomColors
          ? 'border-b border-warm-200/50 px-4 py-2.5 text-center text-xs font-medium tracking-wider'
          : 'border-b border-warm-200/50 bg-warm-100/80 px-4 py-2.5 text-center text-xs font-medium tracking-wider text-warm-700 dark:border-warm-800/30 dark:bg-warm-900/80 dark:text-warm-300'
      }
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {content}
    </div>
  );
}