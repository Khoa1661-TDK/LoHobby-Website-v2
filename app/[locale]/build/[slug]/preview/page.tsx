// app/[locale]/build/[slug]/preview/page.tsx — server-rendered preview surface
// embedded by EditorShell via <iframe>. Renders the REAL draft blocks.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { fetchPageBySlugDraft } from '@/lib/page-builder';
import PreviewCanvas from '@/components/page-builder/preview/PreviewCanvas';
import PreviewBridge from '@/components/page-builder/preview/PreviewBridge';

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = 'force-dynamic';

export default async function BuilderPreviewPage(props: Props): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/${slug}/preview`)}`);
  }

  const page = await fetchPageBySlugDraft(slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-white">
      <PreviewBridge />
      <PreviewCanvas blocks={page.layout} />
    </div>
  );
}
