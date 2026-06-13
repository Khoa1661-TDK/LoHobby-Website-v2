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
