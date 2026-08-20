// app/(console)/admin/console/products/page.tsx
//
// Products list. Server component; the AppShell chrome comes from the group
// layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { Button } from '@/components/console/ui/Button';
import { BulkActionBar } from '@/components/console/products/BulkActionBar';
import { FilterBar } from '@/components/console/products/FilterBar';
import { ProductsTable } from '@/components/console/products/ProductsTable';
import { countProducts, listProductRows } from '@/lib/console/products';

export default async function ProductsPage() {
  const [rows, total] = await Promise.all([listProductRows(30), countProducts()]);
  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Sản phẩm"
        meta={
          <span className="rounded-[var(--adm-radius)] bg-[var(--adm-raised)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--adm-ink-3)]">
            {total}
          </span>
        }
        actions={
          <Button variant="primary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm sản phẩm
          </Button>
        }
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)]">
        <FilterBar />
        <BulkActionBar selectedCount={selectedCount} />
        <ProductsTable rows={rows} />
        <div className="flex items-center border-t border-[var(--adm-line)] px-7 py-[13px] text-[12px] font-medium text-[var(--adm-ink-3)]">
          Hiển thị 1–{rows.length} trong {total} sản phẩm
        </div>
      </div>
    </div>
  );
}
