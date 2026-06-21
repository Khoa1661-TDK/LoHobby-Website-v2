// src/payload/components/OpenBuilderButton.tsx — links from the Pages admin into the visual builder.
'use client';
import { useDocumentInfo } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';
import { routing } from '@/i18n/routing';

export function OpenBuilderButton(): ReactElement | null {
  const { savedDocumentData } = useDocumentInfo();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const slug =
    savedDocumentData && typeof savedDocumentData.slug === 'string'
      ? savedDocumentData.slug
      : '';
  if (!slug) return null;

  const builderHref = `/${routing.defaultLocale}/build/${slug}`;

  const handleSetHomepage = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/page-builder/set-homepage', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.href) router.push(data.href);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
      <a href={builderHref} className="btn btn--style-primary" style={{ display: 'inline-flex' }}>
        Open visual builder
      </a>
      <button
        type="button"
        onClick={handleSetHomepage}
        disabled={loading}
        className="btn btn--style-secondary"
        style={{ display: 'inline-flex' }}
      >
        {loading ? 'Working…' : 'Set as homepage'}
      </button>
    </div>
  );
}