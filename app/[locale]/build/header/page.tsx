// app/[locale]/build/header/page.tsx — admin-gated visual editor for the site header
// (announcement banner + navigation tabs). Static segment, sibling to build/[slug],
// so it inherits the minimal builder chrome from build/layout.tsx.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import type { Field } from 'payload';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { describeFieldsAsSchema } from '@/lib/page-builder/block-schemas';
import { announcementField, tabsField } from '@/src/payload/globals/SiteHeader';
import { type Locale } from '@/i18n/routing';
import HeaderEditorShell from '@/components/page-builder/HeaderEditorShell';

type Props = { params: Promise<{ locale: Locale }> };

export const dynamic = 'force-dynamic';

export default async function HeaderBuilderPage(props: Props): Promise<ReactElement> {
  const { locale } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/header`)}`);
  }

  const current = await payload.findGlobal({ slug: 'site-header', depth: 1 });

  // The announcement group is edited as its inner fields (enabled/text/link/...); the tabs
  // array is edited via a single-field schema so FieldRenderer renders its ArrayField.
  const announcementInner = 'fields' in announcementField ? (announcementField.fields as Field[]) : [];
  const announcementSchema = describeFieldsAsSchema('announcement', 'Announcement banner', announcementInner);
  const tabsSchema = describeFieldsAsSchema('tabs', 'Navigation tabs', [tabsField]);

  const initial = {
    announcement:
      (current as { announcement?: Record<string, unknown> }).announcement ?? {},
    tabs: Array.isArray((current as { tabs?: unknown }).tabs)
      ? ((current as { tabs?: Record<string, unknown>[] }).tabs as Record<string, unknown>[])
      : [],
  };

  return (
    <HeaderEditorShell
      locale={locale}
      announcementSchema={announcementSchema}
      tabsSchema={tabsSchema}
      initial={initial}
    />
  );
}
