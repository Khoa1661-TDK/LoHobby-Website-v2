// app/[locale]/build/[slug]/preview/page.tsx — server-rendered preview surface
// embedded by EditorShell via <iframe>. Renders the REAL draft blocks.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { fetchPageBySlugDraft } from '@/lib/page-builder';
import { type Locale } from '@/i18n/routing';
import PreviewCanvas from '@/components/page-builder/preview/PreviewCanvas';
import PreviewBridge from '@/components/page-builder/preview/PreviewBridge';
import Providers from '@/components/providers';
import { getStoreBranding } from '@/lib/store-branding';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamic = 'force-dynamic';

export default async function BuilderPreviewPage(props: Props): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  // Match the storefront request locale so server- and client-side translations resolve.
  setRequestLocale(locale);
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/${slug}/preview`)}`);
  }

  const page = await fetchPageBySlugDraft(slug, locale);
  if (!page) notFound();

  // The preview renders the REAL storefront blocks, some of which consume storefront
  // contexts and throw during SSR when their provider is absent: ProductCard's
  // WishlistButton needs <Providers>, and ProductCard itself calls useTranslations,
  // which needs <NextIntlClientProvider>. The builder layout deliberately omits both,
  // so the preview surface supplies them here to match the storefront layout.
  const [branding, messages] = await Promise.all([getStoreBranding(), getMessages()]);

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers branding={branding}>
        <div className="min-h-screen bg-white">
          <PreviewBridge />
          <PreviewCanvas blocks={page.layout} />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
