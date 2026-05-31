// app/(payload)/admin/coupons/create-form.tsx
'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCouponAction } from './actions';

export default function CouponCreateForm(): ReactElement {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    const maxUsesRaw = String(form.get('maxUses') ?? '').trim();
    const result = await createCouponAction({
      code: String(form.get('code') ?? ''),
      discountType: String(form.get('discountType') ?? 'PERCENT') as 'PERCENT' | 'FIXED',
      discountValue: Number(form.get('discountValue') ?? 0),
      minOrderAmount: Number(form.get('minOrderAmount') ?? 0),
      maxUses: maxUsesRaw.length > 0 ? Number(maxUsesRaw) : null,
      expiresAt: String(form.get('expiresAt') ?? '').trim() || null,
    });

    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success('Đã tạo mã giảm giá.');
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <h2 className="font-semibold text-neutral-900">Mã giảm giá mới</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Mã
          <input
            name="code"
            required
            placeholder="WELCOME10"
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono uppercase"
          />
        </label>
        <label className="block text-sm">
          Loại giảm
          <select name="discountType" className="mt-1 w-full rounded-md border px-3 py-2">
            <option value="PERCENT">Phần trăm (%)</option>
            <option value="FIXED">Số tiền cố định (₫)</option>
          </select>
        </label>
        <label className="block text-sm">
          Giá trị giảm
          <input
            name="discountValue"
            type="number"
            min={1}
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Đơn tối thiểu (₫)
          <input
            name="minOrderAmount"
            type="number"
            min={0}
            defaultValue={0}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Lượt dùng tối đa (để trống = không giới hạn)
          <input name="maxUses" type="number" min={1} className="mt-1 w-full rounded-md border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Hết hạn
          <input name="expiresAt" type="date" className="mt-1 w-full rounded-md border px-3 py-2" />
        </label>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? 'Đang lưu…' : 'Tạo mã'}
      </button>
    </form>
  );
}
