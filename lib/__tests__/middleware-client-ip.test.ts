// lib/__tests__/middleware-client-ip.test.ts
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// middleware.ts imports next-intl/middleware, whose nested `next` dependency
// fails to resolve `next/server` under this pnpm layout in the Vitest `node`
// environment (unrelated to the code under test). Mock it out — it's a
// third-party dependency this test doesn't exercise, not the code we own.
vi.mock('next-intl/middleware', () => ({ default: () => () => {} }));

const { clientIp } = await import('@/middleware');

function reqWithHeaders(headers: Record<string, string>): NextRequest {
  return new NextRequest('https://example.com/api/register', { headers });
}

describe('clientIp', () => {
  it('should return the last hop of x-forwarded-for, not the first', () => {
    const req = reqWithHeaders({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 203.0.113.9' });
    expect(clientIp(req)).toBe('203.0.113.9');
  });

  it('should trim whitespace around the last hop', () => {
    const req = reqWithHeaders({ 'x-forwarded-for': '1.2.3.4 ,  203.0.113.9  ' });
    expect(clientIp(req)).toBe('203.0.113.9');
  });

  it('should return the single hop unchanged when only one is present', () => {
    const req = reqWithHeaders({ 'x-forwarded-for': '203.0.113.9' });
    expect(clientIp(req)).toBe('203.0.113.9');
  });

  it('should fall back to x-real-ip when x-forwarded-for is absent', () => {
    const req = reqWithHeaders({ 'x-real-ip': '198.51.100.7' });
    expect(clientIp(req)).toBe('198.51.100.7');
  });

  it('should prefer x-forwarded-for over x-real-ip when both are present', () => {
    const req = reqWithHeaders({
      'x-forwarded-for': '1.2.3.4, 203.0.113.9',
      'x-real-ip': '198.51.100.7',
    });
    expect(clientIp(req)).toBe('203.0.113.9');
  });

  it('should return "unknown" when neither header is present', () => {
    const req = reqWithHeaders({});
    expect(clientIp(req)).toBe('unknown');
  });
});
