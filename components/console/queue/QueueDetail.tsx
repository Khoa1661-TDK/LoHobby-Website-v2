// components/console/queue/QueueDetail.tsx
//
// The crawl review queue detail (board 5b): a per-product review with a
// before/after diff. Left column carries the media, video and category plus the
// variant table; right column carries the editable fields. A changed field sits
// on the same baseline in both columns (the "↗ trước …" hint shares the value's
// row). Server component: pure presentation over a single QueueItemDetail.
//
// The detail shapes and the artboard's sample row live here (not in
// QueueTypes.ts, which the list screen owns) so the data layer can import them
// from one place without coupling to the grid's row shape.

import { StatusPill } from '@/components/console/ui/StatusPill';
import { Button } from '@/components/console/ui/Button';

export interface QueueImage {
  /** 'main' renders the "Chính" tag; 'new' renders the "Mới" tag; 'add' is the dashed drop slot. */
  kind: 'main' | 'new' | 'add';
}

export interface QueueVariant {
  color: string;
  sku: string;
  price: number;
  stock: number;
}

export interface QueueItemDetail {
  id: string;
  /** Product name shown in the breadcrumb, verbatim from the artboard. */
  name: string;
  /** Full title field ("Tiêu đề"), verbatim from the artboard. */
  title: string;
  category: string;
  price: number;
  /** Previous price from the last crawl, shown as the "↗ trước …" hint. */
  previousPrice: number;
  stock: number;
  description: string;
  images: QueueImage[];
  variants: QueueVariant[];
}

export const QUEUE_ITEM_DETAIL: QueueItemDetail = {
  id: 'q3',
  name: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
  title:
    'Móc Khóa Game Minecraft Totem Hồi Sinh (Totem of Undying) Phụ kiện trang trí',
  category: 'Móc khóa',
  price: 129000,
  previousPrice: 99000,
  stock: 42,
  description:
    'Totem Hồi Sinh phiên bản mô hình móc khóa, chất liệu nhựa cứng cao cấp, sơn tay chi tiết. Sản phẩm dành cho fan Minecraft, treo balo, treo xe, làm quà tặng...',
  images: [
    { kind: 'main' },
    { kind: 'new' },
    { kind: 'new' },
    { kind: 'add' },
  ],
  variants: [
    { color: 'Đen', sku: 'sp-11085546208-0', price: 129000, stock: 12 },
    { color: 'Trắng', sku: 'sp-11085546208-1', price: 129000, stock: 15 },
    { color: 'Xám', sku: 'sp-11085546208-2', price: 129000, stock: 0 },
    { color: 'Đỏ', sku: 'sp-11085546208-3', price: 139000, stock: 9 },
  ],
};

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

function variantCountLabel(count: number): string {
  return `${count} lựa chọn`;
}

function ImageTile({ image }: { image: QueueImage }) {
  if (image.kind === 'add') {
    return (
      <div className="flex aspect-square items-center justify-center border border-dashed border-[var(--adm-line-2)] text-[var(--adm-ink-4)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    );
  }

  const isNew = image.kind === 'new';
  return (
    <div
      className={`relative aspect-square bg-[var(--adm-placeholder)] ${
        image.kind === 'main' ? 'border-2 border-[var(--adm-action)]' : ''
      } ${isNew ? 'shadow-[inset_0_0_0_2px_var(--adm-ok-dot)]' : ''}`}
    >
      {image.kind === 'main' ? (
        <span className="absolute bottom-1 left-1 bg-[var(--adm-action)] px-[5px] py-[2px] text-[9px] font-semibold text-[var(--adm-action-ink)]">
          Chính
        </span>
      ) : null}
      {isNew ? (
        <span className="absolute right-1 top-1 bg-[var(--adm-ok-dot)] px-1 py-[2px] text-[8px] font-semibold text-[var(--adm-action-ink)]">
          Mới
        </span>
      ) : null}
    </div>
  );
}

function VariantRow({ variant, isLast }: { variant: QueueVariant; isLast: boolean }) {
  return (
    <tr className={isLast ? '' : 'border-b border-[var(--adm-raised)]'}>
      <td className="px-1 py-2 text-[12px] font-medium text-[var(--adm-ink)]">{variant.color}</td>
      <td className="px-1 py-2 font-mono text-[11px] font-medium text-[var(--adm-ink-3)]">
        {variant.sku}
      </td>
      <td className="adm-num px-1 py-2 font-mono text-[12px] font-semibold text-[var(--adm-ink)]">
        {formatVnd(variant.price)}
      </td>
      <td
        className={`adm-num px-1 py-2 font-mono text-[12px] font-semibold ${
          variant.stock === 0 ? 'text-[var(--adm-fail-ink)]' : 'text-[var(--adm-ink)]'
        }`}
      >
        {variant.stock}
      </td>
    </tr>
  );
}

export function QueueDetail({ item }: { item: QueueItemDetail }) {
  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb + product name + status + actions */}
      <div className="flex items-center gap-3 border-b border-[var(--adm-line)] px-7 py-4">
        <span className="text-[13px] font-medium text-[var(--adm-ink-3)]">← Hàng đợi duyệt</span>
        <span className="text-[var(--adm-line)]">/</span>
        <span className="text-[15px] font-bold text-[var(--adm-ink)]">{item.name}</span>
        <StatusPill tone="wait">Đã thay đổi từ lần crawl trước</StatusPill>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary">Từ chối</Button>
          <Button variant="primary">Duyệt sản phẩm này</Button>
        </div>
      </div>

      {/* Two-column body: media + variants (left), editable fields (right) */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left column */}
        <div className="flex min-w-0 flex-[1.1] flex-col gap-5 overflow-y-auto border-r border-[var(--adm-line)] p-6">
          {/* Thư viện ảnh */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
              Thư viện ảnh — kéo để sắp xếp
            </div>
            <div className="grid grid-cols-5 gap-2">
              {item.images.map((image, i) => (
                <ImageTile key={i} image={image} />
              ))}
            </div>
          </div>

          {/* Video sản phẩm */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
              Video sản phẩm
            </div>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[var(--adm-action)]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--adm-action-ink)">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--adm-ink-2)]">
                <div className="h-full w-[35%] bg-[var(--adm-action-ink)]" />
              </div>
            </div>
          </div>

          {/* Danh mục sản phẩm */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
              Danh mục sản phẩm
            </div>
            <div className="flex border border-[var(--adm-action)]">
              <span className="flex-1 px-3 py-2.5 text-[13px] font-medium text-[var(--adm-ink)]">
                {item.category}
              </span>
              <span className="flex items-center bg-[var(--adm-action)] px-3.5 text-[var(--adm-action-ink)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>

          {/* Biến thể — Màu */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--adm-ink)]">Biến thể — Màu</span>
              <span className="font-mono text-[11px] font-medium text-[var(--adm-ink-3)]">
                {variantCountLabel(item.variants.length)}
              </span>
            </div>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--adm-line)]">
                  <th className="px-1 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                    Màu
                  </th>
                  <th className="px-1 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                    SKU
                  </th>
                  <th className="px-1 py-1.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                    Giá
                  </th>
                  <th className="px-1 py-1.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                    Tồn kho
                  </th>
                </tr>
              </thead>
              <tbody>
                {item.variants.map((variant, i) => (
                  <VariantRow
                    key={variant.sku}
                    variant={variant}
                    isLast={i === item.variants.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-[1.4] flex-col gap-[18px] overflow-y-auto p-6">
          {/* Tiêu đề */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--adm-ink-3)]">Tiêu đề</label>
            <div className="border border-[var(--adm-line)] px-3 py-2.5 text-[13px] font-medium leading-[1.4] text-[var(--adm-ink)]">
              {item.title}
            </div>
          </div>

          {/* Giá bán + Tồn kho */}
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--adm-ink-3)]">Giá bán</label>
              <div className="flex items-center justify-between border border-[var(--adm-action)] px-3 py-2.5 font-mono text-[13px] font-semibold text-[var(--adm-ink)]">
                <span>{formatVnd(item.price)}</span>
                <span className="text-[10px] font-semibold text-[var(--adm-wait-ink)]">
                  ↗ trước {formatVnd(item.previousPrice)}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--adm-ink-3)]">Tồn kho</label>
              <div className="border border-[var(--adm-line)] px-3 py-2.5 font-mono text-[13px] font-semibold text-[var(--adm-ink)]">
                {item.stock}
              </div>
            </div>
          </div>

          <div className="h-px bg-[var(--adm-line)]" />

          {/* Mô tả */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--adm-ink-3)]">
              Mô tả (nguyên văn từ Shopee)
            </label>
            <div className="flex-1 overflow-hidden border border-[var(--adm-line)] px-3 py-2.5 text-[12px] leading-[1.6] text-[var(--adm-ink-2)]">
              {item.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
