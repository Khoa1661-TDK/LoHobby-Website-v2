// app/(payload)/admin/campaigns/send-button.tsx
'use client';

import { useTransition, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { sendCampaignToNewsletterAction } from './actions';

export default function SendCampaignButton({
  campaignId,
}: {
  campaignId: string;
}): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendCampaignToNewsletterAction(campaignId);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success('Đã đánh dấu đã gửi (stub). Kiểm tra server log.');
          router.refresh();
        })
      }
      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {pending ? '…' : 'Gửi (stub)'}
    </button>
  );
}
