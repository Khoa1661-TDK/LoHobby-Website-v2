// lib/page-builder/save-chrome.ts — persist a full chrome-global document from the
// visual Site editor. Globals have no draft state, so this writes the live doc directly
// (matching the header editor). Posting the FULL doc preserves fields outside the
// editor's scope; only Payload system fields are stripped.

const SYSTEM_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'globalType']);

/** Copy `doc` without Payload's read-only system fields. Everything else is retained,
 * so untouched fields survive the save. Does not mutate the input. */
export function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!SYSTEM_FIELDS.has(key)) out[key] = value;
  }
  return out;
}

/** POST the full global doc to Payload REST (mounted at '/admin/api'). Admin-gated;
 * the session cookie rides along via same-origin credentials. */
export async function saveChromeGlobal(
  slug: string,
  doc: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`/admin/api/globals/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(stripSystemFields(doc)),
  });
  if (!res.ok) throw new Error(`Save failed for ${slug}: ${res.status}`);
}
