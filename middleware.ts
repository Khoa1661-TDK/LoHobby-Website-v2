// middleware.ts — CMS-managed legacy redirects + API rate limiting.
//
// Runs on the Edge runtime, which cannot import Payload (the `pg` driver is
// Node-only). It therefore resolves redirect rules over HTTP from the Node
// route `/api/redirects`, which serves the `unstable_cache`-backed map. A small
// in-memory TTL cache fronts that fetch so the common path is a cheap map
// lookup, not a network round-trip per request.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { isRateLimitingEnabled } from '@/lib/feature-flags';
import { checkRateLimit, rateLimitHeaders, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { matchRedirect, type RedirectRule } from '@/lib/redirects-match';
import { isNonLocalizedRoot } from '@/lib/locale-routing';
import { routing } from '@/i18n/routing';

// Locale negotiation, prefix redirects (e.g. `/` → `/vi`), and the NEXT_LOCALE
// cookie. Invoked explicitly for storefront paths only — never /api, /admin, or
// /media — so the redirect → locale → rate-limit ordering below stays explicit.
const intlMiddleware = createIntlMiddleware(routing);

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

function rateLimitResponse(
  req: NextRequest,
  routeKey: string,
  config: (typeof RATE_LIMIT_PRESETS)[keyof typeof RATE_LIMIT_PRESETS],
): NextResponse | null {
  const key = `${routeKey}:${clientIp(req)}`;
  const result = checkRateLimit(key, config);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result, config.limit),
        'Retry-After': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
      },
    },
  );
}

// --- Redirect resolution -----------------------------------------------------

/** Edge instances are reused across requests; cache the map for a short window. */
const REDIRECTS_TTL_MS = 60_000;
let cachedRules: RedirectRule[] = [];
let cachedAt = 0;

async function loadRedirects(req: NextRequest): Promise<RedirectRule[]> {
  const now = Date.now();
  if (now - cachedAt < REDIRECTS_TTL_MS) return cachedRules;

  try {
    const res = await fetch(new URL('/api/redirects', req.nextUrl.origin), {
      // Back the in-memory window with the Next data cache, revalidated by the
      // `redirects` tag the collection hooks flush on every edit.
      next: { revalidate: 300, tags: ['redirects'] },
    });
    if (!res.ok) return cachedRules;
    const data = (await res.json()) as { redirects?: RedirectRule[] };
    cachedRules = Array.isArray(data.redirects) ? data.redirects : [];
    cachedAt = now;
  } catch {
    // Fail open: keep serving the last known map (or empty) rather than 500.
    return cachedRules;
  }
  return cachedRules;
}

/**
 * Resolve a CMS redirect for the inbound path and return the redirect response,
 * or null if no rule matches. Relative destinations are resolved against the
 * request origin; absolute URLs are emitted as-is.
 */
async function redirectResponse(req: NextRequest): Promise<NextResponse | null> {
  const rules = await loadRedirects(req);
  if (rules.length === 0) return null;

  const rule = matchRedirect(req.nextUrl.pathname, rules);
  if (!rule) return null;

  const destination = /^https?:\/\//i.test(rule.to)
    ? rule.to
    : new URL(rule.to, req.nextUrl.origin);
  return NextResponse.redirect(destination, rule.status);
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');
  const isAdmin = pathname.startsWith('/admin');

  // Legacy-URL redirects run FIRST, before any auth/rate-limit checkpoint, and
  // only for storefront paths — never for /api (the redirect map is fetched
  // from /api/redirects; matching there would recurse) or the admin panel.
  if (!isApi && !isAdmin) {
    const redirect = await redirectResponse(req);
    if (redirect) return redirect;
  }

  // --- API: rate limiting only, never locale-prefixed -----------------------
  if (isApi) {
    if (!isRateLimitingEnabled()) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/api/auth') || pathname === '/api/register') {
      const limited = rateLimitResponse(req, 'auth', RATE_LIMIT_PRESETS.auth);
      if (limited) return limited;
    }

    // Analytics beacons use a separate, looser bucket so they don't consume the
    // functional /api budget (and get dropped silently if abused).
    if (pathname.startsWith('/api/track')) {
      const limited = rateLimitResponse(req, 'track', RATE_LIMIT_PRESETS.track);
      if (limited) return limited;
    } else if (
      pathname.startsWith('/api/') &&
      !pathname.startsWith('/api/webhook') &&
      pathname !== '/api/admin/orders/sync-shipments'
    ) {
      const limited = rateLimitResponse(req, 'api', RATE_LIMIT_PRESETS.api);
      if (limited) return limited;
    }

    return NextResponse.next();
  }

  // --- Admin panel + non-localized root routes: pass through ----------------
  if (isAdmin || isNonLocalizedRoot(pathname)) {
    return NextResponse.next();
  }

  // --- Storefront: locale negotiation, prefix redirect, NEXT_LOCALE cookie ---
  return intlMiddleware(req);
}

export const config = {
  // Run on storefront pages (for redirects) and /api (for rate limiting), but
  // skip Next internals and static files (anything with a file extension).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|media/|.*\\..*).*)'],
};
