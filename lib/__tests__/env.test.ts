import { describe, expect, it } from 'vitest';
import { envSchema, validateEnv } from '@/lib/env';

const SECRET = 'x'.repeat(32);

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  PAYLOAD_SECRET: SECRET,
  NEXT_PUBLIC_APP_URL: 'https://shop.example',
  NEXT_PUBLIC_SITE_URL: 'https://shop.example',
};

describe('envSchema', () => {
  it('should accept a minimal valid environment', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it('should reject a missing DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject a PAYLOAD_SECRET shorter than 32 characters', () => {
    const result = envSchema.safeParse({ ...validEnv, PAYLOAD_SECRET: 'short' });
    expect(result.success).toBe(false);
  });

  it('should reject a non-URL NEXT_PUBLIC_APP_URL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NEXT_PUBLIC_APP_URL: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should reject a short AUTH_SECRET when it is provided', () => {
    const result = envSchema.safeParse({ ...validEnv, AUTH_SECRET: 'short' });
    expect(result.success).toBe(false);
  });

  it('should accept a valid AUTH_SECRET override', () => {
    const result = envSchema.safeParse({ ...validEnv, AUTH_SECRET: SECRET });
    expect(result.success).toBe(true);
  });

  it('should reject an incomplete PayOS env fallback', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      PAYOS_CLIENT_ID: 'id',
      PAYOS_API_KEY: 'key',
      // PAYOS_CHECKSUM_KEY missing — incomplete trio
    });
    expect(result.success).toBe(false);
  });

  it('should accept a complete PayOS env fallback', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      PAYOS_CLIENT_ID: 'id',
      PAYOS_API_KEY: 'key',
      PAYOS_CHECKSUM_KEY: 'checksum',
    });
    expect(result.success).toBe(true);
  });
});

describe('validateEnv', () => {
  it('should return the parsed env when valid', () => {
    expect(validateEnv(validEnv).PAYLOAD_SECRET).toBe(SECRET);
  });

  it('should throw a readable error listing problems when invalid', () => {
    expect(() => validateEnv({})).toThrow(
      /Invalid environment configuration/,
    );
  });
});
