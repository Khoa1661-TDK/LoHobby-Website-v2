// app/(payload)/admin/gift-cards/page.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import GiftCardCreateForm from './create-form';
import GiftCardRowActions from './gift-card-actions';
import { formatGiftCardBalance } from '@/lib/gift-card-format';
import { listGiftCardsForAdmin } from '@/lib/gift-cards';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' });

export default async function AdminGiftCardsPage(): Promise<ReactElement> {
  const giftCards = await listGiftCardsForAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Quản trị
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Thẻ quà tặng</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Phát hành thẻ quà tặng kỹ thuật số. Khách nhập mã tại trang thanh toán.
          </p>
        </div>
        <Link
          href="/admin/coupons"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Mã giảm giá →
        </Link>
      </header>

      <GiftCardCreateForm />

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Số dư</th>
              <th className="px-4 py-3">Ban đầu</th>
              <th className="px-4 py-3">Đã dùng</th>
              <th className="px-4 py-3">Hết hạn</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {giftCards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                  Chưa có thẻ quà tặng. Tạo thẻ mới ở form phía trên.
                </td>
              </tr>
            ) : (
              giftCards.map((card) => (
                <tr key={card.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono font-semibold">{card.code}</td>
                  <td className="px-4 py-3">{formatGiftCardBalance(card.balance)}</td>
                  <td className="px-4 py-3">{formatGiftCardBalance(card.initialBalance)}</td>
                  <td className="px-4 py-3">{formatGiftCardBalance(card.usedAmount)}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {card.expiresAt ? dateFormatter.format(card.expiresAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        card.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {card.enabled ? 'Bật' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <GiftCardRowActions
                      giftCardId={card.id}
                      enabled={card.enabled}
                      usedAmount={card.usedAmount}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
