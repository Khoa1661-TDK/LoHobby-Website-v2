// components/console/crawl/JobProgress.tsx
//
// Crawl live progress (board 4) — the RUNNING state of the same route as
// JobLauncher. The page renders the idle launcher; the state machine swaps in
// this board while a job is in flight. Top: the running banner (job name,
// status pill, elapsed line). Left column: overall progress, the four-stage
// pipeline stepper, the count tiles and the live log. Right column: the
// connection-safety note and the most recent products. Server component.

import { StatusPill } from '@/components/console/ui/StatusPill';

export type CrawlStageState = 'done' | 'running' | 'todo';

export interface CrawlStage {
  /** Step number, 1-based, verbatim from the artboard. */
  n: number;
  /** Stage name, verbatim from the artboard. */
  label: string;
  state: CrawlStageState;
}

export const CRAWL_STAGES: CrawlStage[] = [
  { n: 1, label: 'Danh sách', state: 'done' },
  { n: 2, label: 'Trang sản phẩm', state: 'done' },
  { n: 3, label: 'Hình ảnh', state: 'running' },
  { n: 4, label: 'Video', state: 'todo' },
];

const STAGE_STYLE: Record<CrawlStageState, { box: string; step: string; status: string }> = {
  done: {
    box: 'border-b-[var(--adm-action)] bg-[var(--adm-raised)]',
    step: 'text-[var(--adm-ink-3)]',
    status: 'text-[var(--adm-ink)]',
  },
  running: {
    box: 'border-b-[var(--adm-busy-dot)] bg-[var(--adm-action)]',
    step: 'text-[var(--adm-action-ink-2)]',
    status: 'text-[var(--adm-action-ink)]',
  },
  todo: {
    box: 'border-b-[var(--adm-line)] bg-[var(--adm-raised)]',
    step: 'text-[var(--adm-ink-4)]',
    status: 'text-[var(--adm-ink-4)]',
  },
};

const STAGE_STATUS: Record<CrawlStageState, string> = {
  done: 'Hoàn tất',
  running: 'Đang chạy',
  todo: 'Chưa đến',
};

export interface CrawlLogLine {
  /** Timestamp, verbatim from the artboard. */
  time: string;
  /** Log message, verbatim from the artboard. */
  text: string;
  /** 'ok' renders the line in the ok tone; 'fail' in the fail tone; everything else is ink-2. */
  tone: 'info' | 'ok' | 'fail';
}

export const CRAWL_LOG: CrawlLogLine[] = [
  { time: '08:03:12', text: 'bắt đầu crawl · shopee.vn/lohobby', tone: 'info' },
  { time: '08:03:44', text: 'danh sách: 118 sản phẩm đang hoạt động', tone: 'info' },
  {
    time: '09:02:10',
    text: '[76/118] Mô Hình Máy Bay Tiêm Kích J20 Chengdu — 5 ảnh, 1 video',
    tone: 'info',
  },
  {
    time: '09:04:02',
    text: '[77/118] lỗi tải trang — đã thử lại 3 lần, bỏ qua',
    tone: 'fail',
  },
  {
    time: '09:04:20',
    text: '[78/118] Móc Khóa T1 6 Sao dành cho Tê con — 3 ảnh, không video',
    tone: 'info',
  },
  { time: '09:15:02', text: 'phiên đăng nhập vẫn hợp lệ', tone: 'ok' },
];

const LOG_TONE: Record<CrawlLogLine['tone'], string> = {
  info: 'text-[var(--adm-ink-2)]',
  ok: 'text-[var(--adm-ok-ink)]',
  fail: 'text-[var(--adm-fail-ink)]',
};

export interface RecentProduct {
  /** Product name, verbatim from the artboard. */
  name: string;
}

export const RECENT_PRODUCTS: RecentProduct[] = [
  { name: 'Móc Khóa T1 6 Sao dành cho Tê con' },
  { name: 'Mô Hình Máy Bay Tiêm Kích J20 Chengdu' },
];

export function JobProgress() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Running banner: job name, status pill, elapsed line */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[var(--adm-line)] py-4">
        <span className="text-[16px] font-bold leading-none text-[var(--adm-ink)]">
          Crawl đang chạy — Lô Hobby Store
        </span>
        <StatusPill tone="busy">Đang xử lý</StatusPill>
        <span className="ml-auto font-mono text-[12px] font-medium leading-none text-[var(--adm-ink-3)]">
          Đã chạy 1 giờ 12 phút · bắt đầu 20 thg 8, 08:03
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-7 overflow-hidden p-7">
        {/* Left column: progress, stages, counts, log, actions */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Tiến độ tổng thể */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold leading-none text-[var(--adm-ink)]">
                Tiến độ tổng thể
              </span>
              <span className="font-mono text-[15px] font-bold leading-none text-[var(--adm-ink)]">
                77 / 118 sản phẩm
              </span>
            </div>
            <div className="relative h-2.5 bg-[var(--adm-fill)]">
              <div className="absolute inset-y-0 left-0 w-[65%] bg-[var(--adm-action)]" />
            </div>
            <div className="flex gap-1.5 text-[11px] font-medium leading-none text-[var(--adm-ink-3)]">
              <span>Giai đoạn hiện tại:</span>
              <span className="font-bold text-[var(--adm-ink)]">Đang tải ảnh sản phẩm</span>
            </div>
          </div>

          {/* Four-stage pipeline stepper */}
          <div className="flex gap-0.5">
            {CRAWL_STAGES.map((stage) => (
              <div
                key={stage.n}
                className={`flex flex-1 flex-col gap-1 border-b-[3px] p-3 ${STAGE_STYLE[stage.state].box}`}
              >
                <div
                  className={`text-[10px] font-medium uppercase ${STAGE_STYLE[stage.state].step}`}
                >
                  {stage.n} · {stage.label}
                </div>
                <div className={`text-[13px] font-bold ${STAGE_STYLE[stage.state].status}`}>
                  {STAGE_STATUS[stage.state]}
                </div>
              </div>
            ))}
          </div>

          {/* Count tiles */}
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1 rounded-[var(--adm-radius)] border border-[var(--adm-line)] p-3.5">
              <div className="text-[11px] font-medium text-[var(--adm-ink-3)]">Đã tìm thấy</div>
              <div className="adm-num font-mono text-[22px] font-bold leading-none text-[var(--adm-ok-ink)]">
                77
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 rounded-[var(--adm-radius)] border border-[var(--adm-line)] p-3.5">
              <div className="text-[11px] font-medium text-[var(--adm-ink-3)]">Không có video</div>
              <div className="adm-num font-mono text-[22px] font-bold leading-none text-[var(--adm-wait-ink)]">
                51
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 rounded-[var(--adm-radius)] border border-[var(--adm-line)] p-3.5">
              <div className="text-[11px] font-medium text-[var(--adm-ink-3)]">Lỗi</div>
              <div className="adm-num font-mono text-[22px] font-bold leading-none text-[var(--adm-fail-ink)]">
                2
              </div>
            </div>
          </div>

          {/* Nhật ký */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--adm-radius)] border border-[var(--adm-line)]">
            <div className="border-b border-[var(--adm-line)] px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
              Nhật ký
            </div>
            <div className="flex flex-1 flex-col gap-1.5 overflow-hidden p-3.5 font-mono text-[11px] leading-[1.6]">
              {CRAWL_LOG.map((line, i) => (
                <div key={i} className={LOG_TONE[line.tone]}>
                  {line.time}{' '}
                  <span className="whitespace-pre-wrap">{line.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--adm-radius)] border border-[var(--adm-action)] p-3 text-[13px] font-bold text-[var(--adm-ink)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              Tạm dừng
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-[var(--adm-radius)] border border-[var(--adm-fail-ink)] p-3 text-[13px] font-bold text-[var(--adm-fail-ink)]"
            >
              Hủy công việc
            </button>
          </div>
        </div>

        {/* Right column: connection safety + recent products */}
        <div className="flex w-[340px] shrink-0 flex-col gap-4">
          <div className="flex flex-col gap-2.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-4">
            <div className="text-[12px] font-semibold leading-none text-[var(--adm-ink)]">
              An toàn khi mất kết nối
            </div>
            <div className="text-[12px] leading-[1.5] text-[var(--adm-ink-3)]">
              Tiến độ được lưu liên tục. Tải lại trang này bất cứ lúc nào — công việc vẫn tiếp tục
              chạy trên máy trạm.
            </div>
          </div>
          <div className="flex flex-col gap-2.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-4">
            <div className="text-[12px] font-semibold leading-none text-[var(--adm-ink)]">
              Sản phẩm gần nhất
            </div>
            {RECENT_PRODUCTS.map((product) => (
              <div key={product.name} className="flex items-center gap-2.5">
                <div className="h-9 w-9 shrink-0 bg-[var(--adm-raised)]" />
                <div className="truncate text-[12px] font-medium leading-[1.3] text-[var(--adm-ink)]">
                  {product.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
