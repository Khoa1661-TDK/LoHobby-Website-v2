// components/console/Topbar.tsx
//
// Console top bar. Server-rendered — the only interaction it owns is the
// sidebar toggle, which it reports up via onToggleSidebar. Search, locale,
// theme, and assistant all render but do nothing; they are placeholders for
// screens wired up later.

import { ConsoleIcon } from './ConsoleIcons';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  return (
    <header
      className="flex flex-none items-center gap-4 border-b border-[var(--adm-line)] px-6"
      style={{ height: 'var(--adm-bar-h)' }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Thu gọn thanh điều hướng"
        className="text-[var(--adm-ink-2)]"
      >
        <ConsoleIcon name="queue" size={16} />
      </button>

      <button
        type="button"
        className="flex max-w-[420px] flex-1 items-center gap-2 bg-[var(--adm-raised)] px-3 py-2 text-[var(--adm-ink-3)]"
      >
        <ConsoleIcon name="search" size={16} />
        <span className="text-[13px] font-normal">
          Tìm sản phẩm, đơn hàng, khách hàng...
        </span>
      </button>

      <div className="ml-auto flex items-center gap-3.5">
        <div className="flex items-center border border-[var(--adm-line)]">
          <span className="bg-[var(--adm-ink)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--adm-action-ink)]">
            VI
          </span>
          <span className="px-2.5 py-1.5 text-[11px] font-semibold text-[var(--adm-ink-3)]">
            EN
          </span>
        </div>

        <button
          type="button"
          aria-label="Đổi giao diện sáng/tối"
          className="text-[var(--adm-ink-2)]"
        >
          <ConsoleIcon name="theme" size={18} />
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 border border-[var(--adm-ink)] px-2.5 py-1.5 text-[var(--adm-ink)]"
        >
          <ConsoleIcon name="assistant" size={16} />
          <span className="text-[11px] font-semibold">Trợ lý AI</span>
        </button>
      </div>
    </header>
  );
}
