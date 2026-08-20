// app/(console)/admin/console/marketing/page.tsx
//
// Marketing console — coupons, gift cards, email campaigns, and auto-sale.
// Four artboards (14a–14d) are four tabs of this single route. The tab strip
// is the only client component; the panels are server components passed as
// children, so the client boundary stays minimal. The AppShell chrome comes
// from the group layout, so this page only supplies the content stack.

import { MarketingTabs } from '@/components/console/marketing/MarketingTabs';
import { CouponsPanel } from '@/components/console/marketing/CouponsPanel';
import { GiftCardsPanel } from '@/components/console/marketing/GiftCardsPanel';
import { CampaignsPanel } from '@/components/console/marketing/CampaignsPanel';
import { AutoSalePanel } from '@/components/console/marketing/AutoSalePanel';
import { listCouponRows, listGiftCardRows } from '@/lib/console/marketing';

export default async function MarketingPage() {
  const [couponRows, giftCardRows] = await Promise.all([
    listCouponRows(),
    listGiftCardRows(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <MarketingTabs
        panels={{
          coupons: <CouponsPanel rows={couponRows} />,
          'gift-cards': <GiftCardsPanel rows={giftCardRows} />,
          campaigns: <CampaignsPanel />,
          'auto-sale': <AutoSalePanel />,
        }}
      />
    </div>
  );
}
