// lib/page-builder/render-block-html.tsx — server-only helper that renders a single
// page-builder block to an HTML string. Used by the preview page (initial-HTML seeding
// for data blocks) and by the /api/build/preview-block endpoint (on-demand re-render).
//
// RenderBlocks includes the 4 async data blocks, so this wraps the block in the same
// providers the storefront layout supplies (NextIntlClientProvider + Providers) and
// renders via react-dom/server's renderToReadableStream, which supports async/Suspense
// components — unlike renderToString.
import { renderToReadableStream } from 'react-dom/server';
import type { AbstractIntlMessages } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import RenderBlocks from '@/components/blocks/RenderBlocks';
import Providers from '@/components/providers';
import type { PageBlock } from '@/lib/page-builder';
import type { StoreBranding } from '@/lib/store-branding';

type Opts = {
  locale: string;
  messages: AbstractIntlMessages;
  branding: StoreBranding;
};

export async function renderBlockToHtml(block: PageBlock, opts: Opts): Promise<string> {
  const element = (
    <NextIntlClientProvider locale={opts.locale} messages={opts.messages}>
      <Providers branding={opts.branding}>
        <RenderBlocks blocks={[block]} />
      </Providers>
    </NextIntlClientProvider>
  );

  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}
