// app/(console)/admin/console/media/page.tsx
//
// Media library (board 11, wireframe). Server component; the AppShell chrome
// comes from the group layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { MediaGrid } from '@/components/console/media/MediaGrid';
import { listMediaItems } from '@/lib/console/media';

const MEDIA_TABS = ['Ảnh', 'Video'] as const;

export default async function MediaPage() {
  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <PageHeader
        title="Thư viện media"
        actions={
          <div className="flex gap-2">
            {MEDIA_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className="rounded-[var(--adm-radius)] border border-[var(--adm-line)] px-3 py-[7px] text-[11px] font-medium text-[var(--adm-ink-3)]"
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex h-[100px] items-center justify-center border border-dashed border-[var(--adm-line-2)] text-[12px] font-medium text-[var(--adm-ink-4)]">
        Kéo thả tệp để tải lên
      </div>
      <MediaGrid items={await listMediaItems()} />
    </div>
  );
}
