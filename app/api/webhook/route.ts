// app/api/webhook/route.ts — legacy payOS webhook URL (backward compatible).
import { NextRequest, NextResponse } from 'next/server';
import { GET as providerGet, POST as providerPost } from '@/app/api/webhook/[provider]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  return providerPost(req, { params: Promise.resolve({ provider: 'payos' }) });
}

export async function GET(): Promise<NextResponse> {
  return providerGet(
    new NextRequest('http://localhost/api/webhook/payos'),
    { params: Promise.resolve({ provider: 'payos' }) },
  );
}
