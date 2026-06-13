// app/health/route.ts — fast liveness probe for the compose healthcheck and
// external uptime monitoring. No dependency checks (DB/cache) by design: it
// answers "is the process up", not "is the system healthy".
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { status: 'ok', version: process.env.npm_package_version ?? 'unknown' },
    { status: 200 },
  );
}
