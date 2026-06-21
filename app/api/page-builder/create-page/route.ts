// app/api/page-builder/create-page/route.ts — create a blank draft page, return its builder href.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { routing } from '@/i18n/routing';

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();
  if (!(await isAuthorizedAdmin(payload, requestHeaders))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Untitled',
      status: 'draft',
      layout: [],
    },
  });

  const slug = typeof doc.slug === 'string' ? doc.slug : '';
  return NextResponse.json({ href: `/${routing.defaultLocale}/build/${slug}` });
}
