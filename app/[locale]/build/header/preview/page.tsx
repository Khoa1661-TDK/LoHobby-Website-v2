// app/[locale]/build/header/preview/page.tsx — server-rendered chrome preview embedded
// by SiteChromeEditorShell via <iframe>. Renders the REAL storefront Navbar + Footer so
// the editor sees genuine output. On each autosave the shell reloads this iframe; the
// save busted the relevant cache tag, so the resolvers return fresh values.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { getStoreBranding } from '@/lib/store-branding';
import { type Locale } from '@/i18n/routing';
import { Navbar } from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import Providers from '@/components/providers';

type Props = { params: Promise<{ locale: Locale }> };

export const dynamic = 'force-dynamic';

export default async function ChromePreviewPage(props: Props): Promise<ReactElement> {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();

  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/header/preview`)}`);
  }

  // Navbar/Footer consume storefront contexts (session, branding, wishlist) and
  // next-intl translations; supply the same wrappers the storefront layout uses.
  const [branding, messages] = await Promise.all([getStoreBranding(), getMessages()]);

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers branding={branding}>
        <div className="flex min-h-screen flex-col bg-white">
          <Navbar />
          <div className="flex flex-1 items-center justify-center px-6 py-24 text-center text-sm text-warm-400">
            Storefront content renders here. Edit the header and footer in the panel →
          </div>
          <Footer />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
