// lib/admin-assistant/types.ts — the frozen interface every admin tool implements.
// Types only, plus two const arrays. No runtime imports of Payload config.
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import type { BasePayload } from 'payload';
import type { OrderAction, ShipInput } from '@/lib/order-transitions';

/** What a tool hands back: `content` goes to the model, `emit` goes to the client. */
export type ToolOutcome = { content: string; emit?: unknown };

/** Injected by the route. Tools NEVER import @payload-config themselves. */
export type ToolContext = {
  payload: BasePayload;
  locale: 'vi' | 'en';
};

export type AdminTool = {
  definition: ChatCompletionFunctionTool;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolOutcome>;
};

/** Globals the assistant may write. site-header and navigation are excluded on
 *  purpose: they are block/array structures, better edited at /build/header. */
export const WRITABLE_GLOBALS = [
  'store-settings',
  'shipping-settings',
  'notification-settings',
  'auto-sale-settings',
  'dropship-settings',
] as const;

export type AllowedGlobal = (typeof WRITABLE_GLOBALS)[number];

/** Product fields the assistant may change. Anything else is rejected. */
export const WRITABLE_PRODUCT_FIELDS = [
  'title',
  'price',
  'stock',
  'available',
  'onSale',
  'salePercent',
  'category',
] as const;

export type WritableProductField = (typeof WRITABLE_PRODUCT_FIELDS)[number];

/** A staged write. Produced by a tool, confirmed by a human, executed by apply.ts. */
export type Proposal =
  | {
      kind: 'orderAction';
      docId: number;
      orderCode: number;
      action: OrderAction;
      input?: ShipInput;
      summary: string;
    }
  | {
      kind: 'productUpdate';
      id: number;
      fields: Partial<Record<WritableProductField, unknown>>;
      summary: string;
    }
  | {
      kind: 'productImages';
      id: number;
      image?: number;
      gallery?: number[];
      summary: string;
    }
  | {
      kind: 'settingsUpdate';
      global: AllowedGlobal;
      fields: Record<string, unknown>;
      summary: string;
    };

export function isAllowedGlobal(value: unknown): value is AllowedGlobal {
  return typeof value === 'string' && (WRITABLE_GLOBALS as readonly string[]).includes(value);
}

export function isWritableProductField(value: unknown): value is WritableProductField {
  return (
    typeof value === 'string' && (WRITABLE_PRODUCT_FIELDS as readonly string[]).includes(value)
  );
}
