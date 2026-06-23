// lib/dropshipping/index.ts — Phase 3 dropship integration stub (CJ-ready)
import { isDropshippingEnabled } from '@/lib/feature-flags';
import { getDropshipSettings } from '@/lib/dropshipping/settings';
import { logger } from '@/lib/logger';

export type DropshipFulfillmentRequest = {
  orderCode: number;
  items: Array<{ productId: string; variantSku: string | null; quantity: number }>;
  shippingAddress: string;
};

export type DropshipFulfillmentResult =
  | { ok: true; externalOrderId: string }
  | { ok: false; message: string };

/**
 * Placeholder for CJ Dropshipping (or other provider) API.
 * Enable with ENABLE_DROPSHIPPING=true and configure Payload global.
 */
export async function submitDropshipOrder(
  request: DropshipFulfillmentRequest,
): Promise<DropshipFulfillmentResult> {
  if (!isDropshippingEnabled()) {
    return { ok: false, message: 'Dropshipping is disabled.' };
  }

  const settings = await getDropshipSettings();
  if (!settings.enabled) {
    return { ok: false, message: 'Dropshipping not enabled in CMS settings.' };
  }
  if (!settings.apiKeyConfigured) {
    return {
      ok: false,
      message: 'Configure CJ API credentials in Payload → Dropshipping settings.',
    };
  }

  // v1 stub: log intent only; wire CJ SDK when credentials are available.
  logger.info(
    {
      provider: settings.provider,
      orderCode: request.orderCode,
      itemCount: request.items.length,
    },
    '[dropship] stub submit',
  );

  return {
    ok: true,
    externalOrderId: `stub-${request.orderCode}-${Date.now()}`,
  };
}
