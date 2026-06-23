// lib/payment-secrets.ts — symmetric encryption for gateway credentials.
//
// Secrets entered in the CMS are encrypted with this module BEFORE they touch
// the database, and only ever decrypted on the server (checkout + webhook).
// The plaintext never leaves the server and is never written to Postgres.
//
// Algorithm: AES-256-GCM. The stored blob is base64(iv | authTag | ciphertext).
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { logger } from '@/lib/logger';

const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // AES-256
const VERSION_PREFIX = 'v1:';

let cachedKey: Buffer | undefined;
let warnedAboutFallback = false;

/**
 * Resolve the 32-byte master key. Prefers PAYMENT_SECRETS_KEY (base64). Falls
 * back to deriving a key from AUTH_SECRET via scrypt for dev convenience, with a
 * one-time warning — production should set an explicit PAYMENT_SECRETS_KEY.
 */
function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey;

  const explicit = process.env.PAYMENT_SECRETS_KEY;
  if (explicit && explicit.trim().length > 0) {
    const key = Buffer.from(explicit.trim(), 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new Error(
        `PAYMENT_SECRETS_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). Generate one with: openssl rand -base64 32`,
      );
    }
    cachedKey = key;
    return key;
  }

  const authSecret = process.env.AUTH_SECRET ?? process.env.PAYLOAD_SECRET;
  if (!authSecret) {
    throw new Error(
      'PAYMENT_SECRETS_KEY is not set and no AUTH_SECRET fallback is available. Generate a key with: openssl rand -base64 32',
    );
  }

  if (!warnedAboutFallback) {
    logger.warn(
      '[payment-secrets] PAYMENT_SECRETS_KEY is not set; deriving key from AUTH_SECRET. Set PAYMENT_SECRETS_KEY in production.',
    );
    warnedAboutFallback = true;
  }

  // Static salt: the derived key must be stable across restarts so previously
  // encrypted blobs remain decryptable. Security relies on AUTH_SECRET entropy.
  cachedKey = scryptSync(authSecret, 'payment-secrets-v1', KEY_LENGTH);
  return cachedKey;
}

/** Encrypt an arbitrary JSON-serializable object into a storable string. */
export function encryptCredentials(value: object): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return VERSION_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/** Decrypt a blob produced by {@link encryptCredentials}. Returns null on failure. */
export function decryptCredentials<T>(blob: string): T | null {
  try {
    const key = getMasterKey();
    const withoutPrefix = blob.startsWith(VERSION_PREFIX)
      ? blob.slice(VERSION_PREFIX.length)
      : blob;
    const raw = Buffer.from(withoutPrefix, 'base64');

    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch (error) {
    logger.error({ err: error }, '[payment-secrets] failed to decrypt credentials blob');
    return null;
  }
}
