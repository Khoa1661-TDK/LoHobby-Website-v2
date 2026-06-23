import { z } from 'zod';

/**
 * Fail-fast environment validation.
 *
 * The schema mirrors the real env contract (see `.env.example`), not an
 * idealized one:
 *   - `PAYLOAD_SECRET` is the canonical session secret and is required.
 *   - `AUTH_SECRET` is optional — Auth.js falls back to `PAYLOAD_SECRET` when
 *     it is unset (documented in `.env.example`). When present it must be long.
 *   - PayOS credentials are CMS-managed; the env vars are only a fallback, so
 *     they are optional here (validated at point-of-use in the payment layer).
 *
 * Importing this module never throws — that would break `next build` (which
 * runs without secrets, see DECISIONS.md 2026-06-13) and the test runner.
 * Hard validation happens only when `validateEnv()` is called explicitly from
 * `instrumentation.ts` at server boot.
 */
export const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    PAYLOAD_SECRET: z
      .string()
      .min(32, 'PAYLOAD_SECRET must be at least 32 characters'),
    // Optional: falls back to PAYLOAD_SECRET. Must be strong when provided.
    AUTH_SECRET: z
      .string()
      .min(32, 'AUTH_SECRET must be at least 32 characters when set')
      .optional(),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url('NEXT_PUBLIC_APP_URL must be a valid URL'),
    NEXT_PUBLIC_SITE_URL: z
      .string()
      .url('NEXT_PUBLIC_SITE_URL must be a valid URL'),
    // Optional payment fallbacks (canonical source is the CMS payment method).
    PAYOS_CLIENT_ID: z.string().optional(),
    PAYOS_API_KEY: z.string().optional(),
    PAYOS_CHECKSUM_KEY: z.string().optional(),
  })
  // PayOS env fallback is all-or-nothing: if any one is set, all three must be.
  .refine(
    (env) => {
      const provided = [
        env.PAYOS_CLIENT_ID,
        env.PAYOS_API_KEY,
        env.PAYOS_CHECKSUM_KEY,
      ].filter((v) => v && v.length > 0);
      return provided.length === 0 || provided.length === 3;
    },
    {
      message:
        'PayOS env fallback is incomplete: set all of PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY or none',
      path: ['PAYOS_CHECKSUM_KEY'],
    },
  );

export type Env = z.infer<typeof envSchema>;

/**
 * Validate `process.env` against {@link envSchema} and throw a single, readable
 * error listing every problem. Call once at server boot.
 */
export function validateEnv(
  env: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration. Fix these before starting:\n${issues}`,
    );
  }
  return result.data;
}
