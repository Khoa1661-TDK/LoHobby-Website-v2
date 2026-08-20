// app/(console)/admin/console/reviews/page.tsx
//
// Reviews & messages queues (board 15b). Server component; the AppShell chrome
// comes from the group layout, so this page only supplies the content stack.
// The tab strip is the one client component; the two queues are server
// components passed as children, so the client boundary stays minimal.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { ReviewTabs } from '@/components/console/reviews/ReviewTabs';
import { ReviewQueue } from '@/components/console/reviews/ReviewQueue';
import { MessageQueue } from '@/components/console/reviews/MessageQueue';
import { listMessageRows, listPendingReviewRows } from '@/lib/console/reviews';

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-3 text-[12px] text-[var(--adm-ink-3)]">
      {label}
    </div>
  );
}

export default async function ReviewsPage() {
  const [reviewRows, messageRows] = await Promise.all([
    listPendingReviewRows(),
    listMessageRows(),
  ]);

  return (
    <div className="flex min-h-full flex-col gap-3.5">
      <PageHeader title="Đánh giá & tin nhắn" />
      <ReviewTabs
        panels={{
          reviews: <ReviewQueue rows={reviewRows} />,
          favourites: <EmptyQueue label="Chưa có mục yêu thích" />,
          newsletter: <EmptyQueue label="Chưa có đăng ký bản tin" />,
          messages: <MessageQueue rows={messageRows} />,
        }}
      />
    </div>
  );
}
