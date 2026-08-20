// components/console/assistant/ConsoleAssistantPanel.tsx
//
// Slide-over AI assistant panel: a fixed-width column that sits against the
// right edge of the viewport. Self-contained — no portal, overlay, or
// open/close state; mounting is a later task.

import { ProposalCard } from './ProposalCard';
import type { AssistantProposal } from './types';

const PROPOSAL: AssistantProposal = {
  action: 'Đặt khuyến mãi hàng loạt',
  scope: '43 sản phẩm · danh mục "Móc khóa"',
  before: 'onSale: false',
  after: 'onSale: true, −20%',
  note: 'Áp dụng đến 27/08/2026, 23:59. Sản phẩm đang bị quản lý bởi tự động giảm giá sẽ bị loại khỏi thay đổi này.',
};

export function ConsoleAssistantPanel() {
  return (
    <div className="flex w-[420px] flex-none flex-col border-l border-[var(--adm-line)] bg-[var(--adm-surface)]">
      <div className="flex h-14 flex-none items-center gap-2 border-b border-[var(--adm-line)] px-5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--adm-ink)" strokeWidth="1.8">
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <circle cx="9" cy="13" r="1.1" fill="var(--adm-ink)" />
          <circle cx="15" cy="13" r="1.1" fill="var(--adm-ink)" />
          <line x1="12" y1="7" x2="12" y2="3" />
        </svg>
        <span className="text-[13px] font-bold text-[var(--adm-ink)]">Trợ lý AI</span>
        <span className="ml-auto text-[var(--adm-ink-4)]">✕</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
        <div className="max-w-[80%] self-end bg-[var(--adm-action)] p-2.5 text-[12px] leading-[1.5] text-[var(--adm-action-ink)]">
          Giảm giá 20% cho tất cả sản phẩm danh mục Móc khóa đến hết tuần
        </div>
        <div className="max-w-full self-start bg-[var(--adm-raised)] p-2.5 text-[12px] leading-[1.5] text-[var(--adm-ink)]">
          Tôi đã tìm thấy 43 sản phẩm trong danh mục Móc khóa. Đây là thay đổi
          đề xuất — vui lòng xem lại trước khi áp dụng.
        </div>
        <ProposalCard proposal={PROPOSAL} />
      </div>

      <div className="flex h-16 flex-none items-center gap-2 border-t border-[var(--adm-line)] px-4">
        <div className="flex-1 bg-[var(--adm-raised)] px-3.5 py-2.5 text-[13px] text-[var(--adm-ink-4)]">
          Nhắn với trợ lý...
        </div>
      </div>
    </div>
  );
}
