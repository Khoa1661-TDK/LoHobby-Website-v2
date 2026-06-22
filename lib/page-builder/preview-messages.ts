// lib/page-builder/preview-messages.ts — typed postMessage protocol between the
// builder shell (parent) and the server-rendered preview iframe. Same-origin only.

import type { ThemeMode } from './themed-color';

const SOURCE = 'pb' as const;

export type PreviewToParent =
  | { source: typeof SOURCE; type: 'ready' }
  | { source: typeof SOURCE; type: 'select'; index: number };

export type ParentToPreview =
  | { source: typeof SOURCE; type: 'highlight'; index: number | null }
  | { source: typeof SOURCE; type: 'refresh' }
  | { source: typeof SOURCE; type: 'setTheme'; mode: ThemeMode };

export function ready(): PreviewToParent {
  return { source: SOURCE, type: 'ready' };
}

export function select(index: number): PreviewToParent {
  return { source: SOURCE, type: 'select', index };
}

export function highlight(index: number | null): ParentToPreview {
  return { source: SOURCE, type: 'highlight', index };
}

export function refresh(): ParentToPreview {
  return { source: SOURCE, type: 'refresh' };
}

export function setTheme(mode: ThemeMode): ParentToPreview {
  return { source: SOURCE, type: 'setTheme', mode };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && (value as Record<string, unknown>).source === SOURCE;
}

export function isPreviewToParent(data: unknown): data is PreviewToParent {
  if (!isRecord(data)) return false;
  if (data.type === 'ready') return true;
  if (data.type === 'select') return typeof data.index === 'number';
  return false;
}

export function isParentToPreview(data: unknown): data is ParentToPreview {
  if (!isRecord(data)) return false;
  if (data.type === 'refresh') return true;
  if (data.type === 'highlight') return data.index === null || typeof data.index === 'number';
  if (data.type === 'setTheme') return data.mode === 'light' || data.mode === 'dark';
  return false;
}
