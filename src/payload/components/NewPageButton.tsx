// src/payload/components/NewPageButton.tsx — list-view action: create a blank page, open the builder.
'use client';
import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';

export function NewPageButton(): ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/page-builder/create-page', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      if (typeof data?.href === 'string') {
        router.push(data.href);
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn btn--style-primary"
        style={{ display: 'inline-flex' }}
      >
        {loading ? 'Creating…' : '+ New page'}
      </button>
      {error && (
        <span style={{ fontSize: '0.8rem', color: 'var(--theme-error-500, #c0392b)' }}>
          Could not create page — try again.
        </span>
      )}
    </div>
  );
}
