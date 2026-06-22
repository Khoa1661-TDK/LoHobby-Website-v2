// lib/page-builder/link.ts — shared link helpers for page-builder blocks.
// Same external-URL test used by lib/navigation.ts, kept local so block render
// components don't import server-only navigation code.

/** True for absolute http(s) URLs. */
export function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export type LinkAttrs = { target?: '_blank'; rel?: 'noopener noreferrer' };

/** Resolve `target`/`rel` from the explicit "open in new tab" flag and whether the URL
 *  is absolute. External URLs always get `rel="noopener noreferrer"`. */
export function linkAttrs(href: string, openInNewTab?: boolean | null): LinkAttrs {
  const newTab = Boolean(openInNewTab) || isExternalUrl(href);
  return newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}
