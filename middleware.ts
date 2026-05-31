// middleware.ts — API rate limiting for auth and sensitive routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRateLimitingEnabled } from '@/lib/feature-flags';
import { checkRateLimit, rateLimitHeaders, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';

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

export function middleware(req: NextRequest): NextResponse {
  if (!isRateLimitingEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/auth') || pathname === '/api/register') {
    const limited = rateLimitResponse(req, 'auth', RATE_LIMIT_PRESETS.auth);
    if (limited) return limited;
  }

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/webhook')) {
    const limited = rateLimitResponse(req, 'api', RATE_LIMIT_PRESETS.api);
    if (limited) return limited;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
