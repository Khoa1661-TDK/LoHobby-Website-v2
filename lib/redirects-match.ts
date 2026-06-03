// lib/redirects-match.ts — pure, dependency-free redirect helpers.
//
// EDGE-SAFE. No Node/Payload imports — shared by the Node data layer
// (lib/redirects.ts) and the Edge middleware so a stored `from` and an inbound
// pathname normalize and compare identically on both sides.

/** A single resolved, enabled redirect rule. Plain/serializable for transport. */
export type RedirectRule = {
  /** Normalized inbound path to match (leading slash, no trailing slash). */
  from: string;
  /** Destination path or absolute URL. */
  to: string;
  /** HTTP status to emit. */
  status: 301 | 302;
};

/**
 * Normalize a path for collision-free matching: collapse to a leading slash,
 * strip the trailing slash (except root), drop query/hash. Used by the
 * collection's `from` beforeValidate hook AND the middleware comparison.
 */
export function normalizeRedirectPath(input: string): string {
  let path = (input ?? '').trim();
  if (!path) return '/';
  const queryIndex = path.search(/[?#]/);
  if (queryIndex !== -1) path = path.slice(0, queryIndex);
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.replace(/\/+$/, '');
  return path || '/';
}

/**
 * Find the redirect for a given inbound pathname, or null. Exact match on the
 * normalized path (the `from` field is unique).
 */
export function matchRedirect(
  pathname: string,
  rules: readonly RedirectRule[],
): RedirectRule | null {
  const target = normalizeRedirectPath(pathname);
  for (const rule of rules) {
    if (rule.from === target) return rule;
  }
  return null;
}
