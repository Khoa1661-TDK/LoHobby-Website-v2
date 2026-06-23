// app/health/ready/route.ts — readiness probe. Unlike /health (liveness), this
// verifies the process can actually serve traffic by checking DB connectivity,
// so an instance with a dead database is pulled from rotation instead of
// serving errors. Point the orchestrator's readiness check here.
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const version = process.env.npm_package_version ?? 'unknown';
  try {
    // Cheapest possible round-trip that proves the connection pool is alive.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', version, checks: { database: 'ok' } },
      { status: 200 },
    );
  } catch (error) {
    logger.error(
      { route: '/health/ready', err: error instanceof Error ? error.message : String(error) },
      'readiness probe failed: database unreachable',
    );
    return NextResponse.json(
      { status: 'degraded', version, checks: { database: 'fail' } },
      { status: 503 },
    );
  }
}
