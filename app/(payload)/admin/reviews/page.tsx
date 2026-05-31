import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getAdminUser } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import ModerationButtons from './moderation-buttons';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export default async function AdminReviewsPage(): Promise<ReactElement> {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/admin');
  }

  const reviews = await prisma.review.findMany({
    orderBy: [{ approved: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });

  const pendingCount = reviews.filter((review) => !review.approved).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Quản trị
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Đánh giá sản phẩm</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {pendingCount.toLocaleString('vi-VN')} đánh giá đang chờ duyệt trong tổng số{' '}
            {reviews.length.toLocaleString('vi-VN')} gần nhất.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          ← Về danh mục
        </Link>
      </header>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Khách</th>
                <th className="px-4 py-3">Sao</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    Chưa có đánh giá nào.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="align-top hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      {review.productHandle ? (
                        <Link
                          href={`/product/${review.productHandle}`}
                          className="font-mono text-xs text-sky-700 hover:underline"
                        >
                          {review.productHandle}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-neutral-500">
                          {review.productId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {review.user.name ?? review.user.email}
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-600">{review.rating}★</td>
                    <td className="max-w-md px-4 py-3 text-neutral-700">
                      {review.title ? (
                        <p className="font-medium text-neutral-900">{review.title}</p>
                      ) : null}
                      <p className="text-neutral-600">{review.body}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {dateFormatter.format(review.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          review.approved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {review.approved ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ModerationButtons
                        reviewId={review.id}
                        productHandle={review.productHandle}
                        approved={review.approved}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
