// app/(console)/admin/console/crawl/queue/page.tsx
//
// Crawl review queue — grid. Server component; the AppShell chrome comes from
// the group layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { QueueTabs } from '@/components/console/queue/QueueTabs';
import { QueueBulkBar } from '@/components/console/queue/QueueBulkBar';
import { QueueGrid } from '@/components/console/queue/QueueGrid';
import { QUEUE_ITEMS } from '@/components/console/queue/QueueTypes';

export default function CrawlQueuePage() {
  const selectedCount = QUEUE_ITEMS.filter((i) => i.selected).length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Hàng đợi duyệt — Lô Hobby Store"
        meta={
          <span className="rounded-[var(--adm-radius)] bg-[var(--adm-raised)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--adm-ink-3)]">
            118 sản phẩm
          </span>
        }
        actions={<QueueTabs />}
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)]">
        <QueueBulkBar selectedCount={selectedCount} />
        <QueueGrid items={QUEUE_ITEMS} />
      </div>
    </div>
  );
}
