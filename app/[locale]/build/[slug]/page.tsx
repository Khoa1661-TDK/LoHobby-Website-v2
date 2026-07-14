// app/[locale]/build/[slug]/page.tsx — admin-gated visual builder entry.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { fetchPageBySlugDraft } from '@/lib/page-builder';
import { routing, type Locale } from '@/i18n/routing';
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

  const otherLocale = (routing.locales.find((code) => code !== locale) ?? locale) as Locale;

  // Load both locales' drafts. The active locale must exist (as before). If only the other
  // locale's draft is missing, degrade gracefully: mirror the active structure so the two
  // stay in lockstep (same copy until translated) rather than 404-ing.
  const [page, otherPage] = await Promise.all([
    fetchPageBySlugDraft(slug, locale),
    fetchPageBySlugDraft(slug, otherLocale),
  ]);
  if (!page) notFound();

  const otherLayout = otherPage?.layout ?? (structuredClone(page.layout) as typeof page.layout);
  const otherTitle = otherPage?.title ?? page.title;

  return (
    <EditorShell
      locale={locale}
      page={page}
      otherLocale={otherLocale}
      otherLayout={otherLayout}
      otherTitle={otherTitle}
      schemas={getBlockSchemas()}
    />
  );
}