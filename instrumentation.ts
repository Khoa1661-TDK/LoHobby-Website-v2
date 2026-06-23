/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * We use it to fail fast on a misconfigured environment so a missing/short
 * secret crashes loudly at startup instead of silently at first checkout.
 */
export async function register() {
  // Skip during the build phase: `next build` runs without runtime secrets
  // and without a DB (see DECISIONS.md 2026-06-13).
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // Only validate on the Node.js runtime, not the Edge runtime (middleware).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateEnv } = await import('@/lib/env');
  validateEnv();
}
