// components/console/AppShell.tsx
//
// The one client component in the console shell. It owns the collapsed
// sidebar state and the current pathname, then hands both down to the
// (server-rendered) Sidebar. The outer frame is fixed to the viewport and
// clips overflow; only <main> scrolls, so the sidebar and topbar stay put.

'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--adm-well)] px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
