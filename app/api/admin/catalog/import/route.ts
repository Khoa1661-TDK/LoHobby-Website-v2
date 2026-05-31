// app/api/admin/catalog/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { importProductsCsv } from '@/lib/catalog-import-export';
import { isCatalogImportExportEnabled } from '@/lib/feature-flags';
import { revalidateCatalogCache } from '@/lib/payload-products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isCatalogImportExportEnabled()) {
    return NextResponse.json({ error: 'Import/export disabled' }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
  }

  const text = await file.text();
  const result = await importProductsCsv(text);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  revalidateCatalogCache();
  return NextResponse.json(result);
}
