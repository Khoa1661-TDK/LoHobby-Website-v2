// components/console/marketing/CampaignsPanel.tsx
//
// Board 14c — email campaign list. Server component: a bordered stack of rows,
// each with a campaign subject and a status pill. Sent is ok, scheduled is
// busy, draft is neutral — the three states the canvas uses.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { Button } from '@/components/console/ui/Button';
import { StatusPill } from '@/components/console/ui/StatusPill';
import type { PillTone } from '@/components/console/ui/StatusPill';

export type CampaignStatus = 'sent' | 'scheduled' | 'draft';

export interface CampaignRow {
  id: string;
  /** Campaign subject, verbatim from the artboard. */
  subject: string;
  status: CampaignStatus;
}

export const CAMPAIGN_ROWS: CampaignRow[] = [
  { id: 'm1', subject: 'Khuyến mãi tháng 8 — giảm 15%', status: 'sent' },
  { id: 'm2', subject: 'Sản phẩm mới về — Mô hình máy bay', status: 'scheduled' },
  { id: 'm3', subject: 'Nhắc giỏ hàng bị bỏ quên', status: 'draft' },
];

const STATUS_TONE: Record<CampaignStatus, PillTone> = {
  sent: 'ok',
  scheduled: 'busy',
  draft: 'neutral',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  sent: 'Đã gửi',
  scheduled: 'Đã lên lịch',
  draft: 'Bản nháp',
};

export function CampaignsPanel() {
  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader
        title="Chiến dịch email"
        actions={<Button variant="primary">Soạn chiến dịch</Button>}
      />
      <div className="flex flex-col gap-[2px]">
        {CAMPAIGN_ROWS.map((row, i) => (
          <div
            key={row.id}
            className={`flex items-center gap-3 py-[10px] ${
              i < CAMPAIGN_ROWS.length - 1 ? 'border-b border-[var(--adm-line)]' : ''
            }`}
          >
            <span className="flex-1 font-medium text-[var(--adm-ink)]">{row.subject}</span>
            <StatusPill tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}
