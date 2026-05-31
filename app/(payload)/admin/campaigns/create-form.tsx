// app/(payload)/admin/campaigns/create-form.tsx
'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCampaignAction } from './actions';

export default function CampaignCreateForm(): ReactElement {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    const result = await createCampaignAction({
      name: String(form.get('name') ?? ''),
      subject: String(form.get('subject') ?? ''),
      body: String(form.get('body') ?? ''),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Đã tạo chiến dịch.');
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <h2 className="font-semibold text-neutral-900">Chiến dịch mới</h2>
      <label className="block text-sm">
        Tên nội bộ
        <input name="name" required className="mt-1 w-full rounded-md border px-3 py-2" />
      </label>
      <label className="block text-sm">
        Tiêu đề email
        <input name="subject" required className="mt-1 w-full rounded-md border px-3 py-2" />
      </label>
      <label className="block text-sm">
        Nội dung (plain text)
        <textarea name="body" required rows={6} className="mt-1 w-full rounded-md border px-3 py-2" />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? 'Đang lưu…' : 'Tạo draft'}
      </button>
    </form>
  );
}
