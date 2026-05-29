'use client';

import { useRowLabel } from '@payloadcms/ui';
import type { ReactElement } from 'react';

type TabRow = { label?: string; kind?: string };

const KIND_LABELS: Record<string, string> = {
  home: 'Home',
  'all-products': 'All products',
  category: 'Category',
  custom: 'Custom URL',
  dropdown: 'Dropdown',
};

export function HeaderTabRowLabel(): ReactElement {
  const { data, rowNumber = 0 } = useRowLabel<TabRow>();
  const label = data?.label?.trim();
  const kind = data?.kind ? (KIND_LABELS[data.kind] ?? data.kind) : '';
  const fallback = `Tab ${String(rowNumber + 1).padStart(2, '0')}`;

  if (label && kind) {
    return (
      <span className="row-label">
        {label} <span style={{ opacity: 0.55 }}>({kind})</span>
      </span>
    );
  }

  return <span className="row-label">{label || fallback}</span>;
}
