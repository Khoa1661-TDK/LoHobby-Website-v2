// lib/feature-flags.ts — env-gated Phase 2/3 capabilities (no runtime deps on plugins)

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

/** Phase 2: CSV catalog import/export admin tools */
export function isCatalogImportExportEnabled(): boolean {
  return envFlag('ENABLE_CATALOG_IMPORT_EXPORT', true);
}

/** Phase 2: Prisma revenue dashboard at /admin/analytics */
export function isOrderAnalyticsEnabled(): boolean {
  return envFlag('ENABLE_ORDER_ANALYTICS', true);
}

/** Phase 2: Persist cart rows for logged-in users + merge on login */
export function isPersistedCartEnabled(): boolean {
  return envFlag('ENABLE_PERSISTED_CART', true);
}

/** Deprecated: orders are native Payload `orders` (ShopNex). Flag kept for env compatibility. */
export function isOrderSnapshotMirrorEnabled(): boolean {
  return false;
}

/** Phase 3: Email campaign admin (manual send; no ESP integration yet) */
export function isEmailCampaignsEnabled(): boolean {
  return envFlag('ENABLE_EMAIL_CAMPAIGNS', true);
}

/** Phase 3: Link Prisma users to Payload `store-customers` */
export function isStoreCustomerSyncEnabled(): boolean {
  return envFlag('ENABLE_STORE_CUSTOMER_SYNC', true);
}

/** Phase 3: CJ / dropshipping stub (settings only until API keys configured) */
export function isDropshippingEnabled(): boolean {
  return envFlag('ENABLE_DROPSHIPPING', false);
}

/** API rate limiting via middleware (disable for local load testing). */
export function isRateLimitingEnabled(): boolean {
  return envFlag('ENABLE_RATE_LIMITING', true);
}

/** Digital gift cards at checkout and /admin/gift-cards */
export function isGiftCardsEnabled(): boolean {
  return envFlag('ENABLE_GIFT_CARDS', true);
}

/**
 * Demo/test payment provider: a no-charge gateway for verifying checkout.
 * Always available outside production; in production only when explicitly
 * enabled via ALLOW_DEMO_PAYMENTS (so a forgotten demo method cannot hand out
 * free orders to real customers).
 */
export function isDemoPaymentAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || envFlag('ALLOW_DEMO_PAYMENTS', false);
}

/**
 * Checkout email-verification gate. Defaults to true; set
 * REQUIRE_EMAIL_VERIFICATION=false to temporarily let unverified accounts
 * through checkout — verification links are only reachable at APP_URL, so
 * this stays off between a deploy and setting APP_URL to the real domain.
 * Re-enable once that's configured.
 */
export function isEmailVerificationRequired(): boolean {
  return envFlag('REQUIRE_EMAIL_VERIFICATION', true);
}

/**
 * TEMPORARY (see DECISIONS.md 2026-07-17): accept credentials-provider
 * sessions for admin recognition. Google OAuth cannot run against the raw-IP
 * production host yet, so this is the only way into /admin there. Defaults to
 * false — the Google-only rule that closes the register-then-race privilege
 * escalation stays in force everywhere the flag is not explicitly set. Remove
 * the env var (and this flag) once domain + TLS land and Google sign-in works
 * on the deployed host.
 */
export function isCredentialsAdminAllowed(): boolean {
  return envFlag('ALLOW_CREDENTIALS_ADMIN', false);
}
