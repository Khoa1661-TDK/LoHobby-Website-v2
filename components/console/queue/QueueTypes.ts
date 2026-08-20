// components/console/queue/QueueTypes.ts
//
// Row shape for the crawl review queue. Exported so the data layer can
// implement it later; the queue screen renders the sample rows from the
// artboard verbatim.

export type QueueStatus = 'new' | 'changed' | 'error';

export interface QueueItem {
  id: string;
  /** Product title, verbatim from the artboard. */
  title: string;
  /** Price as shown, e.g. '89.000 ₫'. `null` when the crawl could not read it. */
  price: string | null;
  /** Previous price, shown struck through, when the crawl reports a change. */
  previousPrice: string | null;
  /** Variant summary, e.g. 'Màu · 4'. `'—'` when the source has none. */
  variant: string;
  /** Whether the listing carries video. */
  hasVideo: boolean;
  status: QueueStatus;
  /** Assigned category, or 'Chưa gán' when unassigned, or '—' when unknown. */
  category: string;
  /** Presentational: checked in the artboard. */
  selected: boolean;
  /** Change note under the title, e.g. '↗ giá tăng · +2 ảnh mới'. */
  changeNote: string | null;
}

export const QUEUE_ITEMS: QueueItem[] = [
  {
    id: 'q1',
    title: 'Mô Hình Game Roblox Rival AKEY-47 Phụ Kiện Trang Trí Siêu Đẹp',
    price: '89.000 ₫',
    previousPrice: null,
    variant: 'Màu · 4',
    hasVideo: true,
    status: 'new',
    category: 'Chưa gán',
    selected: true,
    changeNote: null,
  },
  {
    id: 'q2',
    title: 'Móc Khóa Hình Áo bóng đá Việt Nam | Mãnh liệt tinh thần yêu nước',
    price: '25.000 ₫',
    previousPrice: null,
    variant: '—',
    hasVideo: false,
    status: 'new',
    category: 'Chưa gán',
    selected: false,
    changeNote: null,
  },
  {
    id: 'q3',
    title: 'Móc Khóa Game Minecraft Totem Hồi Sinh (Totem of Undying) Phụ kiện trang trí',
    price: '129.000 ₫',
    previousPrice: '99.000 ₫',
    variant: 'Màu · 3',
    hasVideo: true,
    status: 'changed',
    category: 'Móc khóa',
    selected: false,
    changeNote: '↗ giá tăng · +2 ảnh mới',
  },
  {
    id: 'q4',
    title: 'Mô Hình Keyvolver Roblox Rival Cao Cấp - Phụ Kiện Trang Trí Bàn Làm Việc',
    price: '89.000 ₫',
    previousPrice: null,
    variant: '—',
    hasVideo: false,
    status: 'new',
    category: 'Chưa gán',
    selected: false,
    changeNote: null,
  },
  {
    id: 'q5',
    title: 'Mô hình kit lắp ráp máy bay dân sự nhanh nhất thế giới Concorde',
    price: null,
    previousPrice: null,
    variant: '—',
    hasVideo: false,
    status: 'error',
    category: '—',
    selected: false,
    changeNote: null,
  },
  {
    id: 'q6',
    title: 'Mô Hình Máy Bay Tiêm Kích J20 Chengdu - Đồ Chơi Lắp Ráp Trưng Bày',
    price: '269.000 ₫',
    previousPrice: null,
    variant: '—',
    hasVideo: true,
    status: 'new',
    category: 'Chưa gán',
    selected: false,
    changeNote: null,
  },
  {
    id: 'q7',
    title: 'Móc khóa T1 6 Sao dành cho Tê con',
    price: '26.000 ₫',
    previousPrice: null,
    variant: '—',
    hasVideo: false,
    status: 'new',
    category: 'Chưa gán',
    selected: false,
    changeNote: null,
  },
];
