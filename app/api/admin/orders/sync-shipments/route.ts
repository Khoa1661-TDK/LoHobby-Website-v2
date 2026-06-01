// app/api/admin/orders/sync-shipments/route.ts — cron endpoint to sync all in-transit shipments
import { NextRequest, NextResponse } from 'next/server';
import { syncAllActiveShipments } from '@/lib/order-fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === 'development';

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) return true;

  const querySecret = req.nextUrl.searchParams.get('secret');
  return querySecret === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncAllActiveShipments();
  return NextResponse.json({
    ok: true,
    synced: result.synced,
    delivered: result.delivered,
    errors: result.errors,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
