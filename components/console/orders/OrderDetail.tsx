// components/console/orders/OrderDetail.tsx
//
// Order detail, fulfilment workspace. Translated 1:1 from the design
// artboard: breadcrumb header, the "needs handling" notice strip, then a
// two-column body — line items, totals and the fulfilment timeline on the
// left; customer / delivery / payment / stock facts on the right.

import { Button } from '@/components/console/ui/Button';
import { StatusPill } from '@/components/console/ui/StatusPill';
import {
  ORDER_LABEL_LONG,
  ORDER_TONE,
  PAYMENT_LABEL,
  PAYMENT_TONE,
  type OrderDetail as OrderDetailData,
  type OrderTimelineStep,
} from './types';

const LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]';
const SECTION_DIVIDER = 'h-px w-full bg-[var(--adm-line)]';

const TOTAL_TONE_CLASS: Record<string, string> = {
  ink: 'text-[var(--adm-ink)]',
  wait: 'text-[var(--adm-wait-ink)]',
  fail: 'text-[var(--adm-fail-ink)]',
};

export function OrderDetail({ order }: { order: OrderDetailData }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--adm-line)] py-4">
        <span className="text-[13px] font-medium text-[var(--adm-ink-3)]">
          &larr; Đơn hàng
        </span>
        <span className="text-[13px] text-[var(--adm-ink-4)]">/</span>
        <span className="text-[16px] font-bold text-[var(--adm-ink)]">
          {order.code}
        </span>
        <StatusPill tone={PAYMENT_TONE[order.payment]}>
          {PAYMENT_LABEL[order.payment]}
        </StatusPill>
        <StatusPill tone={ORDER_TONE[order.order]}>
          {ORDER_LABEL_LONG[order.order]}
        </StatusPill>
        <span className="ml-auto font-mono text-[12px] font-medium text-[var(--adm-ink-3)]">
          {order.createdAt}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-[var(--adm-line)] bg-[var(--adm-wait-bg)] px-4 py-3">
        <span className="text-[13px] font-semibold text-[var(--adm-ink)]">
          {order.notice}
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="primary" className="px-5 py-[11px] text-[13px] font-bold">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Chuyển sang Đang xử lý
          </Button>
          <Button variant="secondary" className="border-[var(--adm-action)] px-5 py-[11px] text-[13px] font-bold">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="3" width="15" height="13" />
              <path d="M16 8h4l3 3v5h-7V8Z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Ghi nhận vận chuyển
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        <div className="flex flex-1 flex-col gap-5 py-6 pr-0 md:pr-7">
          <div className="flex flex-col gap-2.5">
            <div className={LABEL_CLASS}>Sản phẩm trong đơn</div>
            <div className="flex flex-col">
              {order.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 border-b border-[var(--adm-line)] py-2.5 last:border-b-0"
                >
                  <div className="h-11 w-11 flex-none bg-[var(--adm-placeholder)]" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium leading-[1.3] text-[var(--adm-ink)]">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[var(--adm-ink-3)]">
                      {item.meta}
                    </div>
                  </div>
                  <div className="adm-num font-mono text-[13px] font-semibold text-[var(--adm-ink)]">
                    {item.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 pt-1.5">
              {order.totals.map((line) => (
                <div
                  key={line.label}
                  className="flex items-center justify-between text-[12px] text-[var(--adm-ink-3)]"
                >
                  <span>
                    {line.label}
                    {line.code ? (
                      <span className="ml-1 font-mono text-[11px] font-semibold text-[var(--adm-wait-ink)]">
                        {line.code}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`adm-num font-mono font-medium ${TOTAL_TONE_CLASS[line.tone ?? 'ink']}`}
                  >
                    {line.amount}
                  </span>
                </div>
              ))}
              <div className="my-1 h-px w-full bg-[var(--adm-line)]" />
              <div className="flex items-center justify-between text-[15px] font-bold text-[var(--adm-ink)]">
                <span>Tổng cộng</span>
                <span className="adm-num font-mono text-[16px] font-bold text-[var(--adm-ink)]">
                  {order.grandTotal}
                </span>
              </div>
            </div>
          </div>

          <div className={SECTION_DIVIDER} />

          <div className="flex flex-col gap-2">
            <div className={LABEL_CLASS}>Dòng thời gian</div>
            <div className="flex flex-col gap-4 md:flex-row md:gap-0">
              {order.timeline.map((step) => (
                <TimelineStep key={step.label} step={step} />
              ))}
            </div>
          </div>
        </div>

        <div className="w-full flex-none border-t border-[var(--adm-line)] py-6 md:w-[360px] md:border-l md:border-t-0 md:py-0 md:pl-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className={LABEL_CLASS}>Khách hàng</div>
              <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
                {order.customer.name}
              </div>
              <div className="text-[12px] text-[var(--adm-ink-2)]">
                {order.customer.email}
              </div>
              <div className="text-[12px] text-[var(--adm-ink-2)]">
                {order.customer.phone}
              </div>
            </div>

            <div className={SECTION_DIVIDER} />

            <div className="flex flex-col gap-2">
              <div className={LABEL_CLASS}>Giao hàng</div>
              <div className="text-[12px] font-medium leading-[1.5] text-[var(--adm-ink-2)]">
                {order.shipping.method}
                <br />
                {order.shipping.address}
              </div>
            </div>

            <div className={SECTION_DIVIDER} />

            <div className="flex flex-col gap-2">
              <div className={LABEL_CLASS}>Thanh toán</div>
              <div className="text-[12px] font-medium leading-[1.5] text-[var(--adm-ink-2)]">
                {order.paymentMethod}
              </div>
            </div>

            <div className={SECTION_DIVIDER} />

            <div className="flex flex-col gap-2">
              <div className={LABEL_CLASS}>Tồn kho</div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--adm-ok-ink)]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {order.stock}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ step }: { step: OrderTimelineStep }) {
  return (
    <div className="flex flex-1 flex-col items-start gap-1.5">
      {step.done ? (
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--adm-action)]" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--adm-line-2)]" />
      )}
      <span
        className={`text-[11px] font-semibold ${
          step.done ? 'text-[var(--adm-ink)]' : 'text-[var(--adm-ink-4)]'
        }`}
      >
        {step.label}
      </span>
      <span
        className={`font-mono text-[10px] ${
          step.done ? 'text-[var(--adm-ink-3)]' : 'text-[var(--adm-line-2)]'
        }`}
      >
        {step.time}
      </span>
    </div>
  );
}
