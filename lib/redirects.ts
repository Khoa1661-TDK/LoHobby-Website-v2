// lib/redirects.ts — admin-managed legacy URL redirects (resolves the `redirects` Payload collection)
//
// NODE-ONLY. This module imports the Payload Local API (`getPayload` → `pg`),
// which cannot run in the Edge middleware runtime. Consume it from Server
// Components, route handlers, or `after()` hooks — never import it into
// `middleware.ts`. Middleware obtains the resolved map over HTTP instead.
import config from '@payload-config';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { logger } from '@/lib/logger';

import {
  matchRedirect,
  normalizeRedirectPath,
  type RedirectRule,
} from '@/lib/redirects-match';

// Re-export the edge-safe helpers so Node consumers (and Redirects.ts) have a
// single import surface; the pure logic itself lives in redirects-match.ts.
export { matchRedirect, normalizeRedirectPath };
export type { RedirectRule };

const REDIRECTS_TAG = 'redirects';

type RawRedirect = {
  from?: string | null;
  to?: string | null;
  type?: string | null;
  enabled?: boolean | null;
};

function resolveRule(raw: RawRedirect): RedirectRule | null {
  if (!raw || raw.enabled === false) return null;
  const from = typeof raw.from === 'string' ? normalizeRedirectPath(raw.from) : '';
  const to = typeof raw.to === 'string' ? raw.to.trim() : '';
  if (!from || !to || from === '/') return null;
  const status = raw.type === '302' ? 302 : 301;
  return { from, to, status };
}

async function fetchValidRedirects(): Promise<RedirectRule[]> {
  const payload = await getPayload({ config });

  try {
    const result = await payload.find({
      collection: 'redirects',
      where: { enabled: { equals: true } },
      // Cap defends against an unbounded edge payload; raise if a store needs more.
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    });

    return (result.docs as RawRedirect[])
      .map(resolveRule)
      .filter((r): r is RedirectRule => r !== null);
  } catch (error) {
    // Most likely the collection schema has not been pushed yet. Fail open: an
    // empty map means "no redirects" rather than a broken request pipeline.
    logger.warn(
      { err: error instanceof Error ? error.message : error },
      '[redirects] find failed; serving empty redirect map.',
    );
    return [];
  }
}

/**
 * Cached resolver for every enabled redirect rule. Tag-revalidated (not TTL) so
 * it stays warm until an admin edits the collection — matching the storefront's
 * `unstable_cache` + `revalidateTag` strategy (see lib/navigation.ts).
 */
export const getValidRedirects = unstable_cache(fetchValidRedirects, ['redirects-v1'], {
  revalidate: false,
  tags: [REDIRECTS_TAG],
});

/**
 * Flush the redirect cache after the `redirects` collection is written. Wired
 * into the collection's afterChange / afterDelete hooks.
 */
export function revalidateRedirectsCache(): void {
  try {
    revalidateTag(REDIRECTS_TAG);
  } catch (error) {
    // Safe outside a Next.js request (seed scripts) / during admin saves where
    // the static-generation store may be unavailable.
    logger.warn(
      { err: error instanceof Error ? error.message : error },
      '[redirects] revalidate skipped',
    );
  }
}
