// lib/payos.ts
import { randomInt } from 'node:crypto';
import { PayOS, type Webhook } from '@payos/node';
import { Prisma } from '@/generated/prisma/client';

/**
 * payOS allows any positive integer orderCode up to `Number.MAX_SAFE_INTEGER`,
 * but the local Prisma schema stores `orderCode` as `Int` (PostgreSQL INT4,
 * max 2_147_483_647). We pick a random 10-digit value inside that range so:
 *   - codes are not enumerable (no `max + 1` leak / IDOR amplifier),
 *   - they fit in INT4 without a destructive schema migration,
 *   - the P2002 retry path stays effective on the rare collision.
 *
 * Entropy: log2(1_147_483_647) ≈ 30 bits ⇒ guessing a valid code is ~1 in 10⁹.
 */
const ORDER_CODE_MIN = 1_000_000_000; // 10^9 (10 digits)
const ORDER_CODE_MAX = 2_147_483_647; // PostgreSQL INT4 max (exclusive upper bound)

export type PayOSCredentials = {
  clientId: string;
  apiKey: string;
  checksumKey: string;
};

let client: PayOS | undefined;

function requireEnv(name: 'PAYOS_CLIENT_ID' | 'PAYOS_API_KEY' | 'PAYOS_CHECKSUM_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * Returns a payOS client. When `credentials` are supplied (e.g. resolved by the
 * provider registry) a dedicated client is built from them; otherwise a cached
 * singleton is created from the `PAYOS_*` environment variables. Secrets never
 * leave the server.
 */
export function getPayOS(credentials?: PayOSCredentials): PayOS {
  if (credentials) {
    return new PayOS({
      clientId: credentials.clientId,
      apiKey: credentials.apiKey,
      checksumKey: credentials.checksumKey,
    });
  }

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

/** Random 12-digit orderCode; uniqueness is enforced by the DB + P2002 retry path. */
export function generateOrderCode(): number {
  return randomInt(ORDER_CODE_MIN, ORDER_CODE_MAX);
}

/**
 * @deprecated Use {@link generateOrderCode}. Retained for compatibility with any
 * legacy import paths; behaviour is now identical to `generateOrderCode`.
 */
export async function allocateOrderCode(): Promise<number> {
  return generateOrderCode();
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * payOS uses ISO-8583 `'00'` to indicate a successful settlement; everything else
 * (failed, refunded, cancelled, partial) MUST NOT promote the order to PAID.
 */
export const PAYOS_SUCCESS_CODE = '00';

/** True when the verified webhook payload represents a successful settlement. */
export function isPayOSPaymentSuccess(data: { code?: string }): boolean {
  return data.code === PAYOS_SUCCESS_CODE;
}
