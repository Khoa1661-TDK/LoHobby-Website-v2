// app/api/admin/catalog/export/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { exportProductsCsv } from '@/lib/catalog-import-export';
import { isCatalogImportExportEnabled } from '@/lib/feature-flags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isCatalogImportExportEnabled()) {
    return NextResponse.json({ error: 'Import/export disabled' }, { status: 404 });
  }

  const csv = await exportProductsCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
