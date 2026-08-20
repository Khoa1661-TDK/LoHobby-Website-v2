// app/(console)/admin/console/crawl/queue/[id]/page.tsx
//
// Crawl review queue detail (board 5b). Server component; the AppShell chrome
// comes from the group layout, so this page only supplies the content stack.

import { QueueDetail, QUEUE_ITEM_DETAIL } from '@/components/console/queue/QueueDetail';

export default async function CrawlQueueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex h-full flex-col">
      <QueueDetail item={QUEUE_ITEM_DETAIL} />
    </div>
  );
}
