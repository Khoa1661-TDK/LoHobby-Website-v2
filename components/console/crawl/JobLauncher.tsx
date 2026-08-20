// components/console/crawl/JobLauncher.tsx
//
// Crawl launcher (board 3) — the idle state of /admin/console/crawl. Left
// column carries the crawl source, the scope radios and the crawl history;
// right column carries the workstation status, the "what happens" explainer
// and the inert primary action. Server component: pure presentation, the
// radios are uncontrolled and the primary button does nothing yet.
//
// Board 4 (JobProgress.tsx) is the SAME route while a job runs; the page
// renders this idle state and the state machine swaps in JobProgress later.

import { StatusPill } from '@/components/console/ui/StatusPill';
import type { PillTone } from '@/components/console/ui/StatusPill';

export interface CrawlHistoryRow {
  /** Run timestamp, verbatim from the artboard. */
  time: string;
  /** Scope label, verbatim from the artboard. */
  scope: string;
  /** Result line, verbatim from the artboard. */
  result: string;
  /** Status label, verbatim from the artboard. */
  status: string;
  /** Pill tone for the status label. */
  tone: PillTone;
}

export const CRAWL_HISTORY: CrawlHistoryRow[] = [
  {
    time: '18 thg 8, 21:40',
    scope: 'Toàn bộ cửa hàng',
    result: '116 tìm thấy',
    status: 'Hoàn tất',
    tone: 'ok',
  },
  {
    time: '11 thg 8, 09:12',
    scope: 'Giới hạn 50',
    result: '50 tìm thấy',
    status: 'Hoàn tất',
    tone: 'ok',
  },
  {
    time: '2 thg 8, 14:03',
    scope: 'Toàn bộ cửa hàng',
    result: '102 tìm thấy · 3 lỗi',
    status: 'Có lỗi',
    tone: 'fail',
  },
];

const WHAT_HAPPENS: string[] = [
  'Việc được xếp hàng ngay lập tức, kể cả khi máy trạm ngoại tuyến.',
  'Khi máy trạm trực tuyến, crawl bắt đầu tự động — không cần thao tác thêm.',
  'Sản phẩm crawl được vào hàng đợi duyệt, không lên cửa hàng ngay.',
];

export function JobLauncher() {
  return (
    <div className="flex min-h-0 flex-1 gap-8 overflow-hidden">
      {/* Left column: crawl source + scope, then crawl history */}
      <div className="flex min-w-0 flex-[1.3] flex-col gap-6 overflow-y-auto">
        {/* Nguồn crawl */}
        <div className="flex flex-col gap-4 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-6">
          <div className="text-[14px] font-semibold leading-none text-[var(--adm-ink)]">
            Nguồn crawl
          </div>

          {/* URL + Xác thực */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold leading-none text-[var(--adm-ink-3)]">
              URL cửa hàng Shopee
            </label>
            <div className="flex items-stretch border border-[var(--adm-action)]">
              <input
                defaultValue="https://shopee.vn/lohobby"
                aria-label="URL cửa hàng Shopee"
                className="min-w-0 flex-1 border-none bg-transparent px-3.5 py-[11px] font-mono text-[13px] font-medium text-[var(--adm-ink)] outline-none"
              />
              <span className="flex items-center whitespace-nowrap bg-[var(--adm-action)] px-5 text-[13px] font-semibold text-[var(--adm-action-ink)]">
                Xác thực
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] leading-[1.4] text-[var(--adm-ok-ink)]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Đã tìm thấy cửa hàng "Lô Hobby Store" · 118 sản phẩm đang hoạt động
            </div>
          </div>

          <div className="h-px bg-[var(--adm-line)]" />

          {/* Phạm vi */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-[var(--adm-ink-3)]">
              Phạm vi
            </div>

            {/* Toàn bộ cửa hàng — selected */}
            <label className="flex cursor-pointer items-center gap-2.5 border border-[var(--adm-action)] p-3">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[var(--adm-action)]">
                <span className="h-2 w-2 rounded-full bg-[var(--adm-action)]" />
              </span>
              <span className="text-[13px] font-semibold leading-[1.3] text-[var(--adm-ink)]">
                Toàn bộ cửa hàng
                <span className="block text-[12px] font-normal leading-[1.4] text-[var(--adm-ink-3)]">
                  Crawl tất cả 118 sản phẩm đang hoạt động
                </span>
              </span>
            </label>

            {/* Giới hạn số lượng — unselected */}
            <label className="flex cursor-pointer items-center gap-2.5 border border-[var(--adm-line)] p-3">
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--adm-line-2)]" />
              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-[1.3] text-[var(--adm-ink)]">
                Giới hạn số lượng
                <span className="block text-[12px] font-normal leading-[1.4] text-[var(--adm-ink-3)]">
                  Chỉ crawl N sản phẩm mới nhất
                </span>
              </span>
              <input
                defaultValue="50"
                aria-label="Giới hạn số lượng"
                className="w-20 border border-[var(--adm-line)] px-2.5 py-2 font-mono text-[13px] font-medium text-[var(--adm-ink-4)] outline-none"
              />
            </label>
          </div>
        </div>

        {/* Lịch sử crawl */}
        <div className="flex flex-col gap-3 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-6">
          <div className="text-[14px] font-semibold leading-none text-[var(--adm-ink)]">
            Lịch sử crawl — Lô Hobby Store
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--adm-line)]">
                <th className="px-1 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                  Thời gian
                </th>
                <th className="px-1 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                  Phạm vi
                </th>
                <th className="px-1 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                  Kết quả
                </th>
                <th className="px-1 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {CRAWL_HISTORY.map((row, i) => (
                <tr
                  key={row.time}
                  className={i < CRAWL_HISTORY.length - 1 ? 'border-b border-[var(--adm-line)]' : ''}
                >
                  <td className="px-1 py-2.5 text-[12px] font-medium text-[var(--adm-ink)]">
                    {row.time}
                  </td>
                  <td className="px-1 py-2.5 text-[12px] text-[var(--adm-ink-2)]">{row.scope}</td>
                  <td className="px-1 py-2.5 font-mono text-[12px] font-medium text-[var(--adm-ink)]">
                    {row.result}
                  </td>
                  <td className="px-1 py-2.5">
                    <StatusPill tone={row.tone}>{row.status}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right column: workstation status, explainer, primary action */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Máy trạm: Ngoại tuyến */}
        <div className="flex flex-col gap-3 rounded-[var(--adm-radius)] border border-[var(--adm-wait-ink)] bg-[var(--adm-wait-bg)] p-5">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--adm-wait-dot)]" />
            <span className="text-[13px] font-bold leading-none text-[var(--adm-ink)]">
              Máy trạm: Ngoại tuyến
            </span>
          </div>
          <div className="text-[12px] leading-[1.5] text-[var(--adm-wait-ink)]">
            Máy tính của bạn hiện chưa mở. Việc này bình thường — khi bạn bắt đầu, việc sẽ được
            xếp vào hàng đợi và tự động chạy ngay khi máy tính mở trình duyệt có đăng nhập Shopee.
          </div>
          <div className="h-px bg-[var(--adm-line)]" />
          <div className="text-[11px] font-medium leading-[1.4] text-[var(--adm-wait-ink)]">
            Lần cuối hoạt động: 18 thg 8, 22:15 (2 ngày trước)
          </div>
        </div>

        {/* Điều gì sẽ xảy ra */}
        <div className="flex flex-col gap-2.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-5">
          <div className="text-[12px] font-semibold leading-none text-[var(--adm-ink)]">
            Điều gì sẽ xảy ra
          </div>
          {WHAT_HAPPENS.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-4 shrink-0 font-mono text-[11px] font-bold text-[var(--adm-ink-3)]">
                {i + 1}
              </span>
              <span className="text-[12px] leading-[1.5] text-[var(--adm-ink-2)]">{step}</span>
            </div>
          ))}
        </div>

        {/* Bắt đầu crawl — inert until the data layer wires it up */}
        <button
          type="button"
          disabled
          className="mt-auto flex items-center justify-center gap-2 rounded-[var(--adm-radius)] bg-[var(--adm-action)] px-5 py-3.5 text-[14px] font-bold text-[var(--adm-action-ink)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="3" x2="12" y2="7" />
          </svg>
          Bắt đầu crawl · sẽ xếp hàng
        </button>
      </div>
    </div>
  );
}
