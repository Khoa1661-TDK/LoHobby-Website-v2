// lib/payos.ts
import { PayOS, type Webhook } from '@payos/node';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

/** payOS requires a positive integer orderCode; start above small test values. */
const MIN_ORDER_CODE = 1_000_000;

let client: PayOS | undefined;

function requireEnv(name: 'PAYOS_CLIENT_ID' | 'PAYOS_API_KEY' | 'PAYOS_CHECKSUM_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getPayOS(): PayOS {
  if (!client) {
    client = new PayOS({
      clientId: requireEnv('PAYOS_CLIENT_ID'),
      apiKey: requireEnv('PAYOS_API_KEY'),
      checksumKey: requireEnv('PAYOS_CHECKSUM_KEY'),
    });
  }
  return client;
}

export function isPayOSWebhook(body: unknown): body is Webhook {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.signature !== 'string' || record.signature.length === 0) {
    return false;
  }
  const data = record.data;
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const payload = data as Record<string, unknown>;
  return typeof payload.orderCode === 'number' && typeof payload.amount === 'number';
}

/** Monotonic unique orderCode for payOS (max existing + 1). */
export async function allocateOrderCode(): Promise<number> {
  const { _max } = await prisma.order.aggregate({ _max: { orderCode: true } });
  const next = Math.max(MIN_ORDER_CODE, (_max.orderCode ?? MIN_ORDER_CODE - 1) + 1);
  if (!Number.isSafeInteger(next)) {
    throw new Error('orderCode exceeds safe integer range');
  }
  return next;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
