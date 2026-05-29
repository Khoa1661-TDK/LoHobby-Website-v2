'use client';

import { useRowLabel } from '@payloadcms/ui';
import type { ReactElement } from 'react';

type DropdownRow = { label?: string };

export function HeaderDropdownItemRowLabel(): ReactElement {
  const { data, rowNumber = 0 } = useRowLabel<DropdownRow>();
  const label = data?.label?.trim();
  const fallback = `Item ${String(rowNumber + 1).padStart(2, '0')}`;

  return <span className="row-label">{label || fallback}</span>;
}
