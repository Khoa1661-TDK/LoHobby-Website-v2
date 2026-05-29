// lib/payload-hooks.ts — shared Payload hook helpers

/** Passed on product updates triggered by Media library resync hooks. */
export const MEDIA_RESYNC_CONTEXT = { fromMediaResync: true } as const;

export function isMediaResync(req: { context?: Record<string, unknown> }): boolean {
  return req.context?.fromMediaResync === true;
}
