// components/console/products/ProductEditor.tsx
//
// Product editor wireframe (board 7): title row with preview/save actions, the
// auto-sale fact chips, then a two-column body — content placeholders plus the
// variants table placeholder on the left, a fixed 320px property rail on the
// right. Reproduced exactly as drawn; placeholder regions stay placeholder.

import { Button } from '@/components/console/ui/Button';
import { StatusPill } from '@/components/console/ui/StatusPill';

export interface ProductEditorFacts {
  title: string;
  autoSaleManaged: string;
  autoSaleReleasedAt: string;
}

export function ProductEditor({ facts }: { facts: ProductEditorFacts }) {
  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="text-[18px] font-bold text-[var(--adm-ink)]">{facts.title}</div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary">Xem trước</Button>
          <Button variant="primary">Lưu</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <StatusPill tone="busy">{facts.autoSaleManaged}</StatusPill>
        <StatusPill tone="neutral">{facts.autoSaleReleasedAt}</StatusPill>
      </div>

      <div className="flex flex-1 gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="h-8 w-[40%] bg-[var(--adm-line)]" />
          <div className="h-3.5 w-[60%] bg-[var(--adm-raised)]" />
          <div className="h-[180px] bg-[var(--adm-raised)]" />
          <div className="flex gap-2.5">
            <div className="h-[60px] flex-1 bg-[var(--adm-placeholder)]" />
            <div className="h-[60px] flex-1 bg-[var(--adm-placeholder)]" />
          </div>
          <div className="h-px bg-[var(--adm-line)]" />
          <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
            Biến thể (bảng — trong trang, không mở trang mới, xem mẫu 5b)
          </div>
          <div className="h-[120px] bg-[var(--adm-raised)]" />
        </div>

        <div className="flex w-[320px] flex-none flex-col gap-3">
          <div className="h-[200px] bg-[var(--adm-placeholder)]" />
          <div className="h-[100px] bg-[var(--adm-raised)]" />
          <div className="h-[80px] bg-[var(--adm-raised)]" />
        </div>
      </div>
    </div>
  );
}
