// src/payload/components/HeaderBuilderLink.tsx — points admins from the Site header
// global to the visual builder, where the announcement + navigation tabs are now edited.
'use client';
import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';

export function HeaderBuilderLink(): ReactElement {
  const href = `/${routing.defaultLocale}/build/header`;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ marginBottom: '0.5rem', opacity: 0.75 }}>
        The announcement banner and navigation tabs are edited in the visual builder.
      </p>
      <a href={href} className="btn btn--style-primary" style={{ display: 'inline-flex' }}>
        Edit header &amp; navigation
      </a>
    </div>
  );
}
