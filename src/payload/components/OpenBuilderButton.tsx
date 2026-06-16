// src/payload/components/OpenBuilderButton.tsx — links from the Pages admin into the visual builder.
'use client';
import { useDocumentInfo } from '@payloadcms/ui';
import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';

export function OpenBuilderButton(): ReactElement | null {
  const { savedDocumentData } = useDocumentInfo();
  const slug =
    savedDocumentData && typeof savedDocumentData.slug === 'string'
      ? savedDocumentData.slug
      : '';
  if (!slug) return null;

  const href = `/${routing.defaultLocale}/build/${slug}`;
  return (
    <a
      href={href}
      className="btn btn--style-primary"
      style={{ display: 'inline-flex', marginBottom: '1rem' }}
    >
      Open visual builder
    </a>
  );
}