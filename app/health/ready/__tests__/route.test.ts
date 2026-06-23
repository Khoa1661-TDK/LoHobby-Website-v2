import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the DB so we can drive the probe down both paths without a real database.
vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: vi.fn() },
}));
// Silence the logger's stderr output during the failure-path test.
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

import { GET } from '../route';
import { prisma } from '@/lib/prisma';

const queryRaw = vi.mocked(prisma.$queryRaw);

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /health/ready', () => {
  it('should return 200 and database ok when the SELECT 1 succeeds', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
  });

  it('should return 503 and database fail when the DB is unreachable', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.checks.database).toBe('fail');
  });
});
