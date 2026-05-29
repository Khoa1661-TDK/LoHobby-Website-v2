// components/layout/announcement-banner.tsx — CMS-managed bar below the navbar
import Link from 'next/link';
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
    ? 'underline-offset-2 hover:underline'
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
          ? 'border-b border-neutral-200/80 px-4 py-2 text-center text-xs tracking-wide'
          : 'border-b border-neutral-100 bg-white px-4 py-2 text-center text-xs tracking-wide text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100'
      }
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      {content}
    </div>
  );
}
