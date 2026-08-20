// components/console/assistant/ProposalCard.tsx
//
// A staged change awaiting operator confirmation. Presentational: the two
// actions are inert until the data layer lands.

import { Button } from '@/components/console/ui/Button';
import type { AssistantProposal } from './types';

export function ProposalCard({ proposal }: { proposal: AssistantProposal }) {
  return (
    <div className="flex flex-col gap-3 border-2 border-[var(--adm-ink)] p-4">
      <div className="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--adm-wait-ink)" strokeWidth="2">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        <span className="text-[12px] font-bold text-[var(--adm-ink)]">
          Đề xuất thay đổi — chưa áp dụng
        </span>
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
        {proposal.action}
      </div>
      <div className="text-[12px] font-medium text-[var(--adm-ink)]">
        {proposal.scope}
      </div>
      <div className="flex items-center gap-2.5 bg-[var(--adm-raised)] px-3 py-2.5">
        <span className="font-mono text-[12px] font-semibold text-[var(--adm-ink-4)] line-through">
          {proposal.before}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--adm-ink-3)" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
        <span className="font-mono text-[12px] font-bold text-[var(--adm-ok-ink)]">
          {proposal.after}
        </span>
      </div>
      <div className="text-[11px] leading-[1.5] text-[var(--adm-ink-3)]">
        {proposal.note}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" className="flex-1 justify-center">
          Huỷ bỏ
        </Button>
        <Button variant="primary" className="flex-1 justify-center">
          Xác nhận áp dụng
        </Button>
      </div>
    </div>
  );
}
