import { describe, expect, it } from 'vitest';
import { applyAuthUrlDefault, envSchema, validateEnv } from '@/lib/env';

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

  it('should accept a valid runtime APP_URL override', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      APP_URL: 'https://yourshop.example',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a non-URL APP_URL', () => {
    const result = envSchema.safeParse({ ...validEnv, APP_URL: 'not-a-url' });
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

  it('should accept env without NEXT_PUBLIC_* vars when APP_URL is set', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      PAYLOAD_SECRET: SECRET,
      APP_URL: 'https://runtime-domain.com',
    });
    expect(result.success).toBe(true);
  });

  it('should accept env without any URL vars (falls back to localhost)', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      PAYLOAD_SECRET: SECRET,
    });
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

// Auth.js redirects must follow APP_URL: under `next start` the request URL's
// origin is the listen address (localhost), so an unset AUTH_URL sends every
// logout/sign-in redirect to localhost on deployed hosts.
describe('applyAuthUrlDefault', () => {
  it('should default AUTH_URL to APP_URL when neither AUTH_URL nor NEXTAUTH_URL is set', () => {
    const env: Record<string, string | undefined> = {
      APP_URL: 'http://116.118.6.30:3000',
    };
    applyAuthUrlDefault(env);
    expect(env.AUTH_URL).toBe('http://116.118.6.30:3000');
  });

  it('should not override an explicitly set AUTH_URL', () => {
    const env: Record<string, string | undefined> = {
      APP_URL: 'http://app.example',
      AUTH_URL: 'https://auth.example',
    };
    applyAuthUrlDefault(env);
    expect(env.AUTH_URL).toBe('https://auth.example');
  });

  it('should not set AUTH_URL when NEXTAUTH_URL is already set', () => {
    const env: Record<string, string | undefined> = {
      APP_URL: 'http://app.example',
      NEXTAUTH_URL: 'https://legacy.example',
    };
    applyAuthUrlDefault(env);
    expect(env.AUTH_URL).toBeUndefined();
  });

  it('should leave AUTH_URL unset when APP_URL is not configured', () => {
    const env: Record<string, string | undefined> = {};
    applyAuthUrlDefault(env);
    expect(env.AUTH_URL).toBeUndefined();
  });
});
