// app/[locale]/build/[slug]/preview/block/page.tsx — renders ONE page-builder block via
// Next's normal RSC pipeline (so async data blocks fetch their data server-side). The
// preview iframe's BlockSlot fetches this route when a data block's config changes
// and injects the markup inside #pb-block-root. We deliberately do NOT use
// react-dom/server (renderToReadableStream) — Next's App Router forbids it in the app
// module graph — so on-demand single-block HTML comes from a real RSC page render.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getPayload } from 'payload';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { type Locale } from '@/i18n/routing';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import Providers from '@/components/providers';
import { getStoreBranding } from '@/lib/store-branding';
import { parsePreviewBlockParam } from './parse';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<{ block?: string }>;
};

export const dynamic = 'force-dynamic';

export default async function PreviewBlockPage(props: Props): Promise<ReactElement> {
  const { locale, slug } = await props.params;
  const { block: blockParam } = await props.searchParams;
  // Match the storefront request locale so server/client translations resolve.
  setRequestLocale(locale);

  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();
  const authorized = await isAuthorizedAdmin(payload, requestHeaders);
  if (!authorized) {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/${locale}/build/${slug}/preview`)}`);
  }

  const block = parsePreviewBlockParam(blockParam);
  if (!block) notFound();

  // Same providers the storefront layout supplies, so blocks that consume storefront
  // contexts (WishlistButton, useTranslations) render without throwing.
  const [branding, messages] = await Promise.all([getStoreBranding(), getMessages()]);

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers branding={branding}>
        {/* BlockSlot extracts the innerHTML of this marker, discarding page chrome. */}
        <div id="pb-block-root">
          <RenderBlocks blocks={[block]} />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
