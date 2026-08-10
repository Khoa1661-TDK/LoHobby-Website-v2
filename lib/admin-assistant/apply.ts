// lib/admin-assistant/apply.ts — the only write path in the admin assistant.
// The proposal arriving here came back from the browser, so it is untrusted input and is
// re-validated from scratch before anything is executed.
import type { BasePayload } from 'payload';
import {
  isAllowedGlobal,
  isWritableProductField,
  type Proposal,
  type WritableProductField,
} from '@/lib/admin-assistant/types';
import { isOrderAction, type ShipInput } from '@/lib/order-transitions';

export type ApplyResult = { ok: true; message: string } | { ok: false; message: string };

export type ApplyDeps = {
  payload: BasePayload;
  locale: 'vi' | 'en';
  /** Injected so this module never imports @payload-config. */
  runOrderAction: (
    docId: number,
    action: string,
    input?: ShipInput,
  ) => Promise<{ ok: boolean; message: string }>;
};

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function readShipInput(value: unknown): ShipInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  if (typeof input.carrierKey !== 'string' || typeof input.trackingNumber !== 'string') {
    return undefined;
  }
  return {
    carrierKey: input.carrierKey,
    trackingNumber: input.trackingNumber,
    ...(typeof input.customTrackingUrl === 'string'
      ? { customTrackingUrl: input.customTrackingUrl }
      : {}),
  };
}

/** Re-validate an untrusted proposal. Returns null when anything is off. */
export function parseProposal(value: unknown): Proposal | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const summary = typeof raw.summary === 'string' ? raw.summary : '';

  if (raw.kind === 'orderAction') {
    if (!isInt(raw.docId) || !isInt(raw.orderCode) || !isOrderAction(raw.action)) return null;
    const input = readShipInput(raw.input);
    if (raw.action === 'ship' && !input) return null;
    return {
      kind: 'orderAction',
      docId: raw.docId,
      orderCode: raw.orderCode,
      action: raw.action,
      ...(input ? { input } : {}),
      summary,
    };
  }

  if (raw.kind === 'productUpdate') {
    if (!isInt(raw.id) || !raw.fields || typeof raw.fields !== 'object') return null;
    const fields: Partial<Record<WritableProductField, unknown>> = {};
    for (const [key, fieldValue] of Object.entries(raw.fields as Record<string, unknown>)) {
      if (!isWritableProductField(key)) return null;
      fields[key] = fieldValue;
    }
    if (Object.keys(fields).length === 0) return null;
    return { kind: 'productUpdate', id: raw.id, fields, summary };
  }

  if (raw.kind === 'productImages') {
    if (!isInt(raw.id)) return null;
    const image = raw.image === undefined ? undefined : isInt(raw.image) ? raw.image : null;
    if (image === null) return null;
    let gallery: number[] | undefined;
    if (raw.gallery !== undefined) {
      if (!Array.isArray(raw.gallery) || !raw.gallery.every(isInt)) return null;
      gallery = raw.gallery as number[];
    }
    if (image === undefined && gallery === undefined) return null;
    return {
      kind: 'productImages',
      id: raw.id,
      ...(image !== undefined ? { image } : {}),
      ...(gallery !== undefined ? { gallery } : {}),
      summary,
    };
  }

  if (raw.kind === 'settingsUpdate') {
    if (!isAllowedGlobal(raw.global)) return null;
    if (!raw.fields || typeof raw.fields !== 'object' || Array.isArray(raw.fields)) return null;
    const fields = raw.fields as Record<string, unknown>;
    if (Object.keys(fields).length === 0) return null;
    return { kind: 'settingsUpdate', global: raw.global, fields, summary };
  }

  return null;
}

/** Expand dotted paths ("contact.email") into the nested object Payload expects. */
function expandPaths(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(fields)) {
    const segments = path.split('.');
    let cursor = out;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i] as string;
      const existing = cursor[segment];
      if (!existing || typeof existing !== 'object') cursor[segment] = {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1] as string] = value;
  }
  return out;
}

export async function applyProposal(proposal: Proposal, deps: ApplyDeps): Promise<ApplyResult> {
  const { payload, locale } = deps;

  if (proposal.kind === 'orderAction') {
    const result = await deps.runOrderAction(proposal.docId, proposal.action, proposal.input);
    return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
  }

  if (proposal.kind === 'productUpdate') {
    await payload.update({
      collection: 'products',
      id: proposal.id,
      locale: locale as never,
      data: proposal.fields as never,
    });
    return { ok: true, message: proposal.summary || `Đã cập nhật sản phẩm #${proposal.id}.` };
  }

  if (proposal.kind === 'productImages') {
    const data: Record<string, unknown> = {};
    if (proposal.image !== undefined) data.image = proposal.image;
    // Gallery rows are { media } objects; the storedGallery snapshot is refilled by the
    // collection's own afterChange hook on save.
    if (proposal.gallery !== undefined) data.gallery = proposal.gallery.map((id) => ({ media: id }));
    await payload.update({
      collection: 'products',
      id: proposal.id,
      locale: locale as never,
      data: data as never,
    });
    return { ok: true, message: proposal.summary || `Đã đổi ảnh sản phẩm #${proposal.id}.` };
  }

  await payload.updateGlobal({
    slug: proposal.global as never,
    locale: locale as never,
    data: expandPaths(proposal.fields) as never,
  });
  return { ok: true, message: proposal.summary || `Đã cập nhật ${proposal.global}.` };
}
