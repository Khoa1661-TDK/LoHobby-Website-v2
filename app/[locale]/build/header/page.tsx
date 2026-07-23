// app/[locale]/build/header/page.tsx — admin-gated visual Site editor: Header,
// Footer, and Branding tabs over a live storefront preview. Loads the three chrome
// globals at depth 0 (bare ids) so the shell can POST full docs cleanly.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import type { Field } from 'payload';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { describeFieldsAsSchema } from '@/lib/page-builder/block-schemas';
import { announcementField, tabsField } from '@/src/payload/globals/SiteHeader';
import { brandingIdentityFields, footerContentFields } from '@/src/payload/globals/StoreSettings';
import { footerMenuField } from '@/src/payload/globals/Navigation';
import { type Locale } from '@/i18n/routing';
import SiteChromeEditorShell, {
  type ChromeGlobalSlug,
  type ChromeTab,
} from '@/components/page-builder/SiteChromeEditorShell';

type Props = { params: Promise<{ locale: Locale }> };

export const dynamic = 'force-dynamic';

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

export default async function SiteBuilderPage(props: Props): Promise<ReactElement> {
  const { locale } = await props.params;
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/header`)}`);
  }

  const [siteHeader, storeSettings, navigation] = await Promise.all([
    payload.findGlobal({ slug: 'site-header', depth: 0 }),
    payload.findGlobal({ slug: 'store-settings', depth: 0 }),
    payload.findGlobal({ slug: 'navigation', depth: 0 }),
  ]);

  const initialDocs: Record<ChromeGlobalSlug, Record<string, unknown>> = {
    'site-header': asRecord(siteHeader),
    'store-settings': asRecord(storeSettings),
    navigation: asRecord(navigation),
  };

  const announcementInner = 'fields' in announcementField ? (announcementField.fields as Field[]) : [];
  const announcementSchema = describeFieldsAsSchema('announcement', 'Announcement banner', announcementInner);
  const tabsSchema = describeFieldsAsSchema('tabs', 'Navigation tabs', [tabsField]);
  const brandingSchema = describeFieldsAsSchema('branding', 'Branding', brandingIdentityFields);
  const footerContentSchema = describeFieldsAsSchema('footerContent', 'Footer', footerContentFields);
  const footerMenuSchema = describeFieldsAsSchema('footerMenu', 'Footer links', [footerMenuField]);

  const tabs: ChromeTab[] = [
    {
      id: 'header',
      label: 'Header',
      panels: [
        {
          key: 'announcement',
          slug: 'site-header',
          schema: announcementSchema,
          get: (doc) => asRecord(doc.announcement),
          set: (doc, name, value) => ({
            ...doc,
            announcement: { ...asRecord(doc.announcement), [name]: value },
          }),
        },
        {
          key: 'tabs',
          slug: 'site-header',
          schema: tabsSchema,
          get: (doc) => ({ tabs: Array.isArray(doc.tabs) ? doc.tabs : [] }),
          set: (doc, _name, value) => ({ ...doc, tabs: value }),
        },
      ],
    },
    {
      id: 'footer',
      label: 'Footer',
      panels: [
        {
          key: 'footer-content',
          slug: 'store-settings',
          schema: footerContentSchema,
          get: (doc) => doc,
          set: (doc, name, value) => ({ ...doc, [name]: value }),
        },
        {
          key: 'footer-menu',
          slug: 'navigation',
          schema: footerMenuSchema,
          get: (doc) => ({ footerMenu: Array.isArray(doc.footerMenu) ? doc.footerMenu : [] }),
          set: (doc, _name, value) => ({ ...doc, footerMenu: value }),
        },
      ],
    },
    {
      id: 'branding',
      label: 'Branding',
      panels: [
        {
          key: 'branding-identity',
          slug: 'store-settings',
          schema: brandingSchema,
          get: (doc) => doc,
          set: (doc, name, value) => ({ ...doc, [name]: value }),
        },
      ],
    },
  ];

  return <SiteChromeEditorShell locale={locale} tabs={tabs} initialDocs={initialDocs} />;
}
