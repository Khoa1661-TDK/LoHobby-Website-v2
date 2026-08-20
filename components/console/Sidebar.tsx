// components/console/Sidebar.tsx
//
// Console navigation rail. Server-rendered: it takes everything it needs
// (collapsed state + current pathname) as props from AppShell, so it stays a
// plain component. The user row is a hardcoded placeholder — the console does
// not fetch the operator here.

import Link from 'next/link';
import { CONSOLE_NAV, isNavItemActive } from './nav';
import { ConsoleIcon } from './ConsoleIcons';

interface SidebarProps {
  collapsed: boolean;
  pathname: string;
}

export function Sidebar({ collapsed, pathname }: SidebarProps) {
  if (collapsed) {
    return (
      <aside
        className="flex h-full flex-none flex-col items-center border-r border-[var(--adm-line)] bg-[var(--adm-raised)]"
        style={{ width: 64 }}
      >
        <div className="flex items-center justify-center" style={{ height: 'var(--adm-bar-h)' }}>
          <div className="h-[22px] w-[22px] bg-[var(--adm-ink)]" />
        </div>

        <nav className="flex flex-col items-center gap-2 py-4">
          {CONSOLE_NAV.flatMap((group) =>
            group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={
                    'flex h-8 w-8 items-center justify-center ' +
                    (active
                      ? 'bg-[var(--adm-surface)] text-[var(--adm-ink)]'
                      : 'text-[var(--adm-ink-2)]')
                  }
                >
                  <ConsoleIcon name={item.icon} size={16} />
                </Link>
              );
            }),
          )}
        </nav>

        <div className="mt-auto p-4">
          <div className="flex h-[28px] w-[28px] items-center justify-center bg-[var(--adm-ink)] text-[12px] font-semibold text-white">
            TL
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full flex-none flex-col border-r border-[var(--adm-line)] bg-[var(--adm-raised)]"
      style={{ width: 'var(--adm-sidebar-w)' }}
    >
      <div
        className="flex items-center gap-2 border-b border-[var(--adm-line)] px-5"
        style={{ height: 'var(--adm-bar-h)' }}
      >
        <div className="h-[22px] w-[22px] bg-[var(--adm-ink)]" />
        <span className="text-[14px] font-bold text-[var(--adm-ink)]">Lô Hobby</span>
        <span className="ml-auto bg-[var(--adm-line)] px-[6px] py-[2px] text-[10px] font-semibold text-[var(--adm-ink-3)]">
          Admin
        </span>
      </div>

      <nav className="flex flex-col gap-[18px] px-4 pb-2 pt-4">
        {CONSOLE_NAV.map((group) => (
          <div key={group.label} className="flex flex-col gap-[2px]">
            <div className="px-2 pb-[6px] text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--adm-ink-4)]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    'flex items-center gap-2.5 px-2 py-2 text-[13px] ' +
                    (active
                      ? 'border-l-2 border-[var(--adm-ink)] bg-[var(--adm-surface)] font-semibold text-[var(--adm-ink)]'
                      : 'font-medium text-[var(--adm-ink-2)]')
                  }
                >
                  <ConsoleIcon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="adm-num ml-auto text-[11px] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 p-4">
        <div className="flex h-[28px] w-[28px] flex-none items-center justify-center bg-[var(--adm-ink)] text-[12px] font-semibold text-white">
          TL
        </div>
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-[var(--adm-ink)]">Trần Long</span>
          <span className="text-[11px] font-normal text-[var(--adm-ink-3)]">
            Chủ cửa hàng
          </span>
        </div>
      </div>
    </aside>
  );
}
