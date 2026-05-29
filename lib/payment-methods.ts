// lib/payment-methods.ts — resolves the admin-managed `payment-methods` collection.
//
// Returns ONLY non-secret data. Gateway credentials never live here; they are
// resolved server-side from env in lib/payment-providers.ts.
import config from '@payload-config';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getPayload } from 'payload';

const PAYMENT_METHODS_TAG = 'payment-methods';
const PAYMENT_METHODS_REVALIDATE = 60;

export type PaymentMethodKind = 'cod' | 'manual_transfer' | 'gateway';

export type TransferDetails = {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  transferNote: string | null;
  qrImageUrl: string | null;
};

/** Full resolved method (server-side). Still contains no secrets. */
export type ResolvedPaymentMethod = {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
  kind: PaymentMethodKind;
  iconUrl: string | null;
  provider: string | null;
  transfer: TransferDetails | null;
  instructions: string | null;
};

/** Client-safe shape sent to the checkout form. */
export type CheckoutPaymentMethod = {
  key: string;
  label: string;
  description: string | null;
  kind: PaymentMethodKind;
  iconUrl: string | null;
};

type RawUpload = { url?: string | null } | string | number | null | undefined;

type RawTransfer = {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  transferNote?: string | null;
  qrImage?: RawUpload;
} | null;

type RawPaymentMethod = {
  key?: string | null;
  label?: string | null;
  description?: string | null;
  enabled?: boolean | null;
  sortOrder?: number | null;
  kind?: string | null;
  icon?: RawUpload;
  provider?: string | null;
  transferDetails?: RawTransfer;
  instructions?: string | null;
};

function uploadUrl(value: RawUpload): string | null {
  if (!value || typeof value !== 'object') return null;
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  return url.length > 0 ? url : null;
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKind(value: unknown): PaymentMethodKind {
  return value === 'cod' || value === 'gateway' ? value : 'manual_transfer';
}

function resolveOne(raw: RawPaymentMethod): ResolvedPaymentMethod | null {
  const key = toText(raw.key);
  const label = toText(raw.label);
  if (!key || !label) return null;

  const kind = normalizeKind(raw.kind);

  let transfer: TransferDetails | null = null;
  if (kind === 'manual_transfer' && raw.transferDetails) {
    const t = raw.transferDetails;
    transfer = {
      bankName: toText(t.bankName),
      accountNumber: toText(t.accountNumber),
      accountHolder: toText(t.accountHolder),
      transferNote: toText(t.transferNote),
      qrImageUrl: uploadUrl(t.qrImage),
    };
  }

  return {
    key,
    label,
    description: toText(raw.description),
    enabled: raw.enabled !== false,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    kind,
    iconUrl: uploadUrl(raw.icon),
    provider: kind === 'gateway' ? toText(raw.provider) : null,
    transfer,
    instructions: toText(raw.instructions),
  };
}

async function fetchPaymentMethods(): Promise<ResolvedPaymentMethod[]> {
  let docs: RawPaymentMethod[] = [];

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'payment-methods',
      depth: 1,
      limit: 100,
      pagination: false,
      sort: 'sortOrder',
      overrideAccess: true,
    });
    docs = (result.docs as RawPaymentMethod[]) ?? [];
  } catch (error) {
    // Most likely the collection schema hasn't been pushed yet.
    console.warn('[payment-methods] find failed; returning empty list.', error);
    return [];
  }

  return docs
    .map(resolveOne)
    .filter((method): method is ResolvedPaymentMethod => method !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Cached full resolver (server-side, includes disabled methods). */
const getAllPaymentMethods = unstable_cache(fetchPaymentMethods, ['payment-methods'], {
  revalidate: PAYMENT_METHODS_REVALIDATE,
  tags: [PAYMENT_METHODS_TAG],
});

/** Enabled methods in display order, reduced to client-safe fields. */
export async function getCheckoutPaymentMethods(): Promise<CheckoutPaymentMethod[]> {
  const methods = await getAllPaymentMethods();
  return methods
    .filter((method) => method.enabled)
    .map((method) => ({
      key: method.key,
      label: method.label,
      description: method.description,
      kind: method.kind,
      iconUrl: method.iconUrl,
    }));
}

/** Resolve a single method by its key (used for server-side validation + receipts). */
export async function getPaymentMethodByKey(
  key: string,
): Promise<ResolvedPaymentMethod | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const methods = await getAllPaymentMethods();
  return methods.find((method) => method.key === trimmed) ?? null;
}

/** Flush the cache after the collection changes. */
export function revalidatePaymentMethodsCache(): void {
  revalidateTag(PAYMENT_METHODS_TAG);
}
