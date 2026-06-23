// app/api/build/preview-block/route.ts — admin-guarded endpoint that renders a single
// page-builder block to HTML on demand. The preview iframe's DataBlockSlot POSTs a data
// block here to refresh its server-rendered HTML (~250ms) without a full page save.
import config from '@payload-config';
import { getPayload } from 'payload';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { renderBlockToHtml } from '@/lib/page-builder/render-block-html';
import { getStoreBranding } from '@/lib/store-branding';
import { parsePreviewBlockBody } from './parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = parsePreviewBlockBody(data);
  if (!parsed) return new Response('Invalid request body', { status: 400 });

  const payload = await getPayload({ config });
  const authorized = await isAuthorizedAdmin(payload, req.headers);
  if (!authorized) return new Response('Unauthorized', { status: 401 });

  const { locale, block } = parsed;
  setRequestLocale(locale);
  const [messages, branding] = await Promise.all([getMessages(), getStoreBranding()]);

  const html = await renderBlockToHtml(block, { locale, messages, branding });
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
