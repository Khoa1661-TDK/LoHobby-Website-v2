// app/(console)/admin/console/page.tsx
//
// Dashboard. The AppShell (sidebar + topbar) comes from the group layout; this
// page only supplies the content. The 7/30/90-day range selector is the sole
// interactive element and is kept as a small client component; everything else
// is server-rendered from lib/console/dashboard. The crawler status banner is
// still a fixture — the crawler has no backend yet.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { RangeSelector } from '@/components/console/dashboard/RangeSelector';
import { KpiCard, type Kpi } from '@/components/console/dashboard/KpiCard';
import { RevenueChart } from '@/components/console/dashboard/RevenueChart';
import { ConversionFunnel } from '@/components/console/dashboard/ConversionFunnel';
import { TopProductsTable } from '@/components/console/dashboard/TopProductsTable';
import { TrafficSources } from '@/components/console/dashboard/TrafficSources';
import { RecentOrders } from '@/components/console/dashboard/RecentOrders';
import { getDashboardData } from '@/lib/console/dashboard';

export default async function ConsoleHome() {
  const data = await getDashboardData(7);
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Bảng điều khiển" actions={<RangeSelector />} />

      <div className="flex items-center gap-3.5 border border-[var(--adm-wait-ink)] bg-[var(--adm-wait-bg)] px-4 py-3">
        <span className="h-2.5 w-2.5 flex-none rounded-full bg-[var(--adm-wait-dot)]" />
        <span className="text-[12px] font-bold text-[var(--adm-ink)]">
          Crawler: Máy trạm ngoại tuyến
        </span>
        <span className="text-[12px] text-[var(--adm-wait-ink)]">
          Lần crawl gần nhất: 18 thg 8, 21:40 · 116 sản phẩm tìm thấy
        </span>
        <button
          type="button"
          className="ml-auto inline-flex border border-[var(--adm-action)] px-3 py-1.5 text-[11px] font-semibold text-[var(--adm-ink)]"
        >
          Xem hàng đợi duyệt
        </button>
      </div>

      <div className="flex gap-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex-[1.6] min-w-0">
          <RevenueChart series={data.revenue} />
        </div>
        <div className="flex-1 min-w-0">
          <ConversionFunnel stages={data.funnel} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex-[1.4] min-w-0">
          <TopProductsTable rows={data.topProducts} />
        </div>
        <div className="flex-1 min-w-0">
          <TrafficSources sources={data.traffic} />
        </div>
        <div className="flex-[1.2] min-w-0">
          <RecentOrders orders={data.recentOrders} />
        </div>
      </div>
    </div>
  );
}
