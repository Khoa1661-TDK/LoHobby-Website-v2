// lib/locale-routing.ts — pure helpers for deciding which paths the locale
// middleware should handle. Kept dependency-free so it's testable in isolation
// and importable from the Edge middleware.

// Root-level routes that live OUTSIDE the localized `app/[locale]` tree and must
// never be locale-prefixed: the legacy `/products` redirect and metadata routes
// without a file extension (those with one — robots.txt, sitemap.xml — are
// already excluded by the middleware matcher). Prefixing these would 404 them.
export const NON_LOCALIZED_PREFIXES = ['/products', '/icon', '/opengraph-image'] as const;

/** True when the path is a root route that must bypass locale prefixing. */
export function isNonLocalizedRoot(pathname: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
