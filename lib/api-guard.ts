// lib/api-guard.ts — rate-limit helper for Next.js route handlers
import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitConfig,
} from '@/lib/rate-limit';

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

/**
 * Enforce a sliding-window rate limit. Returns a 429 response when exceeded.
 */
export function enforceRateLimit(
  req: NextRequest,
  routeKey: string,
  config: RateLimitConfig,
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
