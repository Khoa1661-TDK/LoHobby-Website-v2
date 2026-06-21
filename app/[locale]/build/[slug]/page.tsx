// app/[locale]/build/[slug]/page.tsx — admin-gated visual builder entry.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { fetchPageBySlugDraft } from '@/lib/page-builder';
import { type Locale } from '@/i18n/routing';
import EditorShell from '@/components/page-builder/EditorShell';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamic = 'force-dynamic';

export default async function BuilderPage(props: Props): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    // Bounce to the Payload admin login, returning here afterwards.
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/${slug}`)}`);
  }

  const page = await fetchPageBySlugDraft(slug, locale);
  if (!page) notFound();

  return (
    <EditorShell
      locale={locale}
      page={page}
      schemas={getBlockSchemas()}
    />
  );
}