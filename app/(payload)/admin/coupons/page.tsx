// app/(payload)/admin/coupons/page.tsx
import Link from 'next/link';
import type { ReactElement } from 'react';
import CouponCreateForm from './create-form';
import CouponRowActions from './coupon-actions';
import { formatCouponLabel, listCouponsForAdmin } from '@/lib/coupons';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' });

export default async function AdminCouponsPage(): Promise<ReactElement> {
  const coupons = await listCouponsForAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Quản trị
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Mã giảm giá</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Tạo và quản lý mã giảm giá cho checkout. Khách nhập mã tại trang thanh toán.
          </p>
        </div>
        <Link
          href="/admin/collections/orders"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Đơn hàng →
        </Link>
      </header>

      <CouponCreateForm />

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Giảm</th>
              <th className="px-4 py-3">Đơn tối thiểu</th>
              <th className="px-4 py-3">Đã dùng</th>
              <th className="px-4 py-3">Hết hạn</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                  Chưa có mã giảm giá. Tạo mã mới ở form phía trên.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono font-semibold">{coupon.code}</td>
                  <td className="px-4 py-3">
                    {formatCouponLabel(coupon.discountType, coupon.discountValue)}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.minOrderAmount.toLocaleString('vi-VN')}₫
                  </td>
                  <td className="px-4 py-3">
                    {coupon.usedCount}
                    {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {coupon.expiresAt ? dateFormatter.format(coupon.expiresAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        coupon.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {coupon.enabled ? 'Bật' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CouponRowActions
                      couponId={coupon.id}
                      enabled={coupon.enabled}
                      usedCount={coupon.usedCount}
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
