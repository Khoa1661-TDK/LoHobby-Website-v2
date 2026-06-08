'use client';

import { useRowLabel } from '@payloadcms/ui';
import type { ReactElement } from 'react';

type SectionRow = {
  blockType?: string;
  headline?: string;
  text?: string;
  title?: string;
};

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero',
  featuredCollection: 'Featured collection',
  featuredProducts: 'Featured products',
  richText: 'Rich text',
  imageWithText: 'Image with text',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  logoCloud: 'Logo cloud',
  newsletter: 'Newsletter',
  faq: 'FAQ',
  promoBanner: 'Promo banner',
  videoEmbed: 'Video embed',
  divider: 'Divider',
};

export function SectionRowLabel(): ReactElement {
  const { data, rowNumber = 0 } = useRowLabel<SectionRow>();
  const type = data?.blockType ? (BLOCK_LABELS[data.blockType] ?? data.blockType) : '';
  const summary = (data?.headline || data?.text || data?.title || '').trim();
  const fallback = `Section ${String(rowNumber + 1).padStart(2, '0')}`;

  if (type && summary) {
    return (
      <span className="row-label">
        {type} <span style={{ opacity: 0.55 }}>— {summary}</span>
      </span>
    );
  }

  return <span className="row-label">{type || fallback}</span>;
}
