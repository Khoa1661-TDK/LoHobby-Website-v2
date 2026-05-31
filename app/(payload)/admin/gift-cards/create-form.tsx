// app/(payload)/admin/gift-cards/create-form.tsx
'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { generateGiftCardCode } from '@/lib/gift-card-format';
import { createGiftCardAction } from './actions';

export default function GiftCardCreateForm(): ReactElement {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    setCode(generateGiftCardCode());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const result = await createGiftCardAction({
      code: String(form.get('code') ?? code),
      initialBalance: Number(form.get('initialBalance') ?? 0),
      expiresAt: String(form.get('expiresAt') ?? '').trim() || null,
      note: String(form.get('note') ?? '').trim() || null,
    });

    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Đã phát hành thẻ quà tặng.');
    event.currentTarget.reset();
    setCode(generateGiftCardCode());
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <h2 className="font-semibold text-neutral-900">Thẻ quà tặng mới</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Mã thẻ
          <div className="mt-1 flex gap-2">
            <input
              name="code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="GC-XXXX-XXXX"
              className="w-full rounded-md border px-3 py-2 font-mono uppercase"
            />
            <button
              type="button"
              onClick={() => setCode(generateGiftCardCode())}
              className="shrink-0 rounded-md border px-3 py-2 text-xs font-medium"
            >
              Tạo mã
            </button>
          </div>
        </label>
        <label className="block text-sm">
          Số dư (VND)
          <input
            name="initialBalance"
            type="number"
            required
            min={1000}
            step={1000}
            defaultValue={100000}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Hết hạn (tùy chọn)
          <input name="expiresAt" type="date" className="mt-1 w-full rounded-md border px-3 py-2" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Ghi chú nội bộ
          <input
            name="note"
            placeholder="VD: Thẻ sinh nhật khách VIP"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? 'Đang tạo…' : 'Phát hành thẻ'}
      </button>
    </form>
  );
}
