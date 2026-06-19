// lib/page-builder/slug.ts — slug-stability decision for the Pages collection.
// A page's slug is generated once (on create, or when the admin types a new one).
// On a plain update (e.g. the builder autosaving title/layout) the stored slug is
// kept so the live builder URL and iframe preview never change mid-edit.
export function shouldPreserveSlug(args: {
  operation: string;
  existingSlug: string;
  providedSlug: string;
}): boolean {
  return args.operation === 'update' && args.existingSlug !== '' && args.providedSlug === '';
}
