// app/api/page-builder/set-homepage/route.ts — create-or-open the `home` page, seeded.
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';
import { routing } from '@/i18n/routing';

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config });
  const requestHeaders = await nextHeaders();
  if (!(await isAuthorizedAdmin(payload, requestHeaders))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    pagination: false,
  });

  if (existing.docs.length === 0) {
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Home',
        slug: 'home',
        status: 'draft',
        layout: buildHomeSeedLayout() as never,
      },
    });
  }

  return NextResponse.json({ href: `/${routing.defaultLocale}/build/home` });
}