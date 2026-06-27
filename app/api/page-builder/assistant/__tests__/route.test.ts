// app/api/page-builder/assistant/__tests__/route.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the heavy deps before importing the route.
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ auth: vi.fn() })) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/page-builder/admin-guard', () => ({ isAuthorizedAdmin: vi.fn() }));

import { POST } from '../route';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

function req(body: unknown): Request {
  return new Request('http://localhost/api/page-builder/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/page-builder/assistant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should 401 when the caller is not an admin', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await POST(req({ prompt: 'hi', layout: [], locale: 'en' }));
    expect(res.status).toBe(401);
  });

  it('should 400 when prompt is missing', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(req({ layout: [], locale: 'en' }));
    expect(res.status).toBe(400);
  });

  it('should 500 when the assistant LLM key is not configured', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const prev = process.env.ASSISTANT_LLM_API_KEY;
    delete process.env.ASSISTANT_LLM_API_KEY;
    try {
      const res = await POST(req({ prompt: 'hi', layout: [], locale: 'en' }));
      expect(res.status).toBe(500);
    } finally {
      if (prev !== undefined) process.env.ASSISTANT_LLM_API_KEY = prev;
    }
  });
});
