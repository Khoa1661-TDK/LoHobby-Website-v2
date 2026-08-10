'use client';

// components/admin-assistant/AdminAssistantLauncher.tsx — the floating entry point.
// Mounted once in the (payload) layout so it appears on every admin screen, including the
// custom Next pages that Payload's own component slots never reach.
import { useState, type ReactElement } from 'react';
import AdminAssistantPanel from '@/components/admin-assistant/AdminAssistantPanel';

export default function AdminAssistantLauncher(): ReactElement | null {
  const [open, setOpen] = useState(false);

  if (open) return <AdminAssistantPanel onClose={() => setOpen(false)} />;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Mở trợ lý quản trị"
      className="fixed bottom-5 right-5 z-[9998] rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-neutral-700"
    >
      Trợ lý
    </button>
  );
}
