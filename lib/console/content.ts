// lib/console/content.ts
//
// Content adapter for the admin console: pages, redirects and the post editor.
// Pure mappers the tests exercise, plus thin readers that fetch and map.
//
// The Pages collection does not use Payload drafts; its published/draft state
// lives on an explicit `status` field, which is what the mapper reads.

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Page, Post, Redirect } from '@/src/payload/payload-types';
import type { PageRow } from '@/components/console/content/PagesList';
import type { RedirectRow } from '@/components/console/content/RedirectsList';

const NO_TITLE = 'Chưa đặt tiêu đề';

// Deliberately not a regex: Tailwind scans lib/ and a regex here has broken the
// whole stylesheet before. Stripping leading slashes by hand is cheap.
function toPagePath(slug: string | null | undefined): string {
  if (!slug || slug === 'home') return '/';
  let rest = slug;
  while (rest.startsWith('/')) rest = rest.slice(1);
  if (rest.length === 0) return '/';
  return `/${rest}`;
}

export function toPageRow(doc: Page): PageRow {
  return {
    id: String(doc.id),
    title: doc.title || NO_TITLE,
    path: toPagePath(doc.slug),
    status: doc.status === 'published' ? 'published' : 'draft',
  };
}

export function toRedirectRow(doc: Redirect): RedirectRow {
  return {
    id: String(doc.id),
    from: doc.from,
    to: doc.to,
  };
}

export async function listPageRows(limit = 25): Promise<PageRow[]> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'pages',
    sort: '-updatedAt',
    limit,
    pagination: false,
    depth: 0,
  });
  return found.docs.map(toPageRow);
}

export async function listRedirectRows(limit = 25): Promise<RedirectRow[]> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'redirects',
    sort: '-createdAt',
    limit,
    pagination: false,
    depth: 0,
    where: {
      enabled: {
        not_equals: false,
      },
    },
  });
  return found.docs.map(toRedirectRow);
}

export async function getPostEditorProps(
  id: string,
): Promise<{ id: string; title: string } | null> {
  try {
    const payload = await getPayload({ config });
    const doc = (await payload.findByID({
      collection: 'posts',
      id: Number(id),
      depth: 0,
    })) as Post;
    return { id: String(doc.id), title: doc.title || NO_TITLE };
  } catch {
    return null;
  }
}
