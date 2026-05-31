// app/(payload)/admin/campaigns/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import CampaignCreateForm from './create-form';
import SendCampaignButton from './send-button';
import { isEmailCampaignsEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';

const dateFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default async function AdminCampaignsPage(): Promise<ReactElement> {
  if (!isEmailCampaignsEnabled()) {
    notFound();
  }

  const [campaigns, subscriberCount] = await Promise.all([
    prisma.emailCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.newsletterSubscriber.count(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
      <header>
        <Link href="/admin/hub" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Hub
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Email campaigns</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Phase 3 — gửi tới {subscriberCount.toLocaleString('vi-VN')} newsletter subscribers
          (stub log; chưa kết nối ESP).
        </p>
      </header>

      <CampaignCreateForm />

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Người nhận</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Chưa có chiến dịch.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.name}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500">{c.subject}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.status}</td>
                  <td className="px-4 py-3">{c.recipientCount || '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.sentAt ? dateFmt.format(c.sentAt) : dateFmt.format(c.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status !== 'SENT' ? <SendCampaignButton campaignId={c.id} /> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
