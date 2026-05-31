// lib/catalog-import-export.ts — lightweight CSV export/import for Payload products (Phase 2)
import config from '@payload-config';
import { getPayload } from 'payload';
import type { PayloadProductDoc } from '@/lib/payload-products';

export type ProductCsvRow = {
  id: string;
  title: string;
  slug: string;
  price: number;
  available: boolean;
  onSale: boolean;
  salePercent: number;
  description: string;
  tags: string;
};

const CSV_HEADERS: Array<keyof ProductCsvRow> = [
  'id',
  'title',
  'slug',
  'price',
  'available',
  'onSale',
  'salePercent',
  'description',
  'tags',
];

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export async function exportProductsCsv(): Promise<string> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'products',
    limit: 5000,
    pagination: false,
    depth: 0,
  });

  const docs = Array.isArray(result.docs) ? (result.docs as PayloadProductDoc[]) : [];
  const lines = [CSV_HEADERS.join(',')];

  for (const doc of docs) {
    const row: ProductCsvRow = {
      id: String(doc.id),
      title: doc.title?.trim() ?? '',
      slug: doc.slug?.trim() ?? '',
      price: Math.max(0, Math.round(doc.price ?? 0)),
      available: doc.available !== false,
      onSale: doc.onSale === true,
      salePercent:
        typeof doc.salePercent === 'number' ? Math.round(doc.salePercent) : 0,
      description: typeof doc.description === 'string' ? doc.description : '',
      tags: Array.isArray(doc.tags) ? doc.tags.filter(Boolean).join('|') : '',
    };
    lines.push(CSV_HEADERS.map((key) => escapeCsv(String(row[key]))).join(','));
  }

  return `${lines.join('\n')}\n`;
}

export type ImportRowResult =
  | { ok: true; created: number; updated: number; skipped: number }
  | { ok: false; message: string };

export async function importProductsCsv(csvText: string): Promise<ImportRowResult> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, message: 'CSV trống hoặc thiếu dòng dữ liệu.' };
  }

  const header = parseCsvLine(lines[0]!.toLowerCase());
  const slugIdx = header.indexOf('slug');
  const titleIdx = header.indexOf('title');
  const priceIdx = header.indexOf('price');
  if (slugIdx < 0 || titleIdx < 0 || priceIdx < 0) {
    return { ok: false, message: 'CSV cần các cột: slug, title, price.' };
  }

  const payload = await getPayload({ config });
  const defaultCategory = await payload.find({
    collection: 'categories',
    limit: 1,
    pagination: false,
    depth: 0,
  });
  const defaultCategoryId = defaultCategory.docs[0]?.id;
  if (!defaultCategoryId) {
    return { ok: false, message: 'Tạo ít nhất một danh mục trong Payload trước khi import.' };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const slug = cells[slugIdx]?.trim();
    const title = cells[titleIdx]?.trim();
    if (!slug || !title) {
      skipped++;
      continue;
    }

    const price = Math.max(0, Math.round(Number(cells[priceIdx]) || 0));
    const availableIdx = header.indexOf('available');
    const onSaleIdx = header.indexOf('onsale');
    const saleIdx = header.indexOf('salepercent');
    const descIdx = header.indexOf('description');
    const tagsIdx = header.indexOf('tags');

    const data = {
      title,
      slug,
      price,
      available: availableIdx >= 0 ? cells[availableIdx] !== 'false' : true,
      onSale: onSaleIdx >= 0 ? cells[onSaleIdx] === 'true' : false,
      salePercent: saleIdx >= 0 ? Math.round(Number(cells[saleIdx]) || 0) : 0,
      description: descIdx >= 0 ? (cells[descIdx] ?? '') : '',
      tags:
        tagsIdx >= 0 && cells[tagsIdx]
          ? cells[tagsIdx]!.split('|').map((t) => t.trim()).filter(Boolean)
          : [],
    };

    const existing = await payload.find({
      collection: 'products',
      where: { slug: { equals: slug } },
      limit: 1,
      pagination: false,
      depth: 0,
    });
    const doc = existing.docs[0];

    if (doc?.id) {
      await payload.update({
        collection: 'products',
        id: doc.id,
        data,
      });
      updated++;
    } else {
      await payload.create({
        collection: 'products',
        draft: false,
        data: {
          ...data,
          category: [defaultCategoryId],
        },
      });
      created++;
    }
  }

  return { ok: true, created, updated, skipped };
}
