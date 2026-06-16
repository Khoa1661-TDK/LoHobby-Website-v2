// src/payload/components/AnalyticsDashboard.tsx — admin dashboard with VND analytics
import { Gutter, SetStepNav } from '@payloadcms/ui';
import {
  BadgePercent,
  Boxes,
  Gift,
  Megaphone,
  Receipt,
  ShoppingBag,
  Star,
  Wallet,
  Wallet2,
} from 'lucide-react';
import type { PayloadRequest } from 'payload';
import type { ReactElement, ReactNode } from 'react';
import { formatVnd } from '@/lib/analytics/currency';
import {
  buildDailySalesChart,
  computeMonthlyMetrics,
  fetchOrdersInRange,
  formatPercentChange,
} from '@/lib/analytics/dashboard';
import { resolvePeriod, previousPeriod } from '@/lib/analytics/period';
import { getTrafficBySource } from '@/lib/analytics/traffic';
import { getProductPerformance, getDiscountedItemPerformance, getProductCtr } from '@/lib/analytics/products';
import { getCartAbandonment } from '@/lib/analytics/carts-data';
import { AnalyticsSalesChart } from '@/src/payload/components/analytics/AnalyticsSalesChart';
import { MetricCard } from '@/src/payload/components/analytics/MetricCard';
import { RankingTable } from '@/src/payload/components/analytics/RankingTable';
import { PeriodSelector } from '@/src/payload/components/analytics/PeriodSelector';

type DashboardProps = {
  payload: PayloadRequest['payload'];
  searchParams?: Record<string, string | string[] | undefined>;
};

type ActionTile = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

const actionTiles: ActionTile[] = [
  {
    href: '/admin/collections/orders',
    label: 'Đơn hàng',
    description: 'Xử lý, vận chuyển và cập nhật trạng thái đơn.',
    icon: <ShoppingBag size={18} aria-hidden />,
  },
  {
    href: '/admin/coupons',
    label: 'Mã giảm giá',
    description: 'Tạo mã giảm theo phần trăm hoặc số tiền.',
    icon: <BadgePercent size={18} aria-hidden />,
  },
  {
    href: '/admin/gift-cards',
    label: 'Thẻ quà tặng',
    description: 'Phát hành và quản lý tín dụng cửa hàng.',
    icon: <Gift size={18} aria-hidden />,
  },
  {
    href: '/admin/campaigns',
    label: 'Chiến dịch',
    description: 'Lên lịch và gửi chiến dịch marketing.',
    icon: <Megaphone size={18} aria-hidden />,
  },
  {
    href: '/admin/reviews',
    label: 'Đánh giá',
    description: 'Duyệt và kiểm duyệt đánh giá sản phẩm.',
    icon: <Star size={18} aria-hidden />,
  },
  {
    href: '/admin/catalog-tools',
    label: 'Công cụ danh mục',
    description: 'Nhập / xuất và đồng bộ sản phẩm hàng loạt.',
    icon: <Boxes size={18} aria-hidden />,
  },
];

const monthLabelFormatter = new Intl.DateTimeFormat('vi-VN', {
  month: 'long',
  year: 'numeric',
});

export async function AnalyticsDashboard(props: DashboardProps): Promise<ReactElement> {
  const now = new Date();
  const period = resolvePeriod(props.searchParams ?? {}, now);
  const prev = previousPeriod(period);

  const [
    currentOrders,
    lastOrders,
    trafficBySource,
    productPerformance,
    discounted,
    cart,
    lastCart,
    ctr,
  ] = await Promise.all([
    fetchOrdersInRange(period.start, period.end),
    fetchOrdersInRange(prev.start, prev.end),
    getTrafficBySource(period.start, period.end),
    getProductPerformance(period.start, period.end),
    getDiscountedItemPerformance(period.start, period.end),
    getCartAbandonment(period.start, period.end),
    getCartAbandonment(prev.start, prev.end),
    getProductCtr(period.start, period.end),
  ]);

  const currentMetrics = computeMonthlyMetrics(currentOrders);
  const lastMetrics = computeMonthlyMetrics(lastOrders);
  const salesData = buildDailySalesChart(currentOrders);
  const titleMap = new Map(
    productPerformance.viewToBuy.map((v) => [v.productId, v.productTitle || v.productHandle]),
  );
  const titleFor = (id: string): string => titleMap.get(id) || id;

  return (
    <Gutter>
      <SetStepNav nav={[{ label: 'Tổng quan', url: '/admin' }]} />

      <div className="dash">
        <header className="dash__header">
          <div>
            <p className="dash__eyebrow">Tổng quan cửa hàng</p>
            <h1 className="dash__title">Bảng điều khiển</h1>
          </div>
          <div className="dash__period-wrap">
            <span className="dash__period">{period.label}</span>
            <PeriodSelector />
          </div>
        </header>

        <ul className="dash__metrics">
          <li>
            <MetricCard
              tone="revenue"
              icon={<Wallet size={18} aria-hidden />}
              title="Doanh thu (VND)"
              value={formatVnd(currentMetrics.revenueVnd)}
              change={formatPercentChange(currentMetrics.revenueVnd, lastMetrics.revenueVnd)}
            />
          </li>
          <li>
            <MetricCard
              tone="value"
              icon={<Receipt size={18} aria-hidden />}
              title="Giá trị đơn TB"
              value={formatVnd(currentMetrics.avgOrderVnd)}
              change={formatPercentChange(currentMetrics.avgOrderVnd, lastMetrics.avgOrderVnd)}
            />
          </li>
          <li>
            <MetricCard
              tone="orders"
              icon={<ShoppingBag size={18} aria-hidden />}
              title="Tổng đơn"
              value={currentMetrics.totalOrders.toLocaleString('vi-VN')}
              change={formatPercentChange(currentMetrics.totalOrders, lastMetrics.totalOrders)}
            />
          </li>
          <li>
            <MetricCard
              tone="paid"
              icon={<Wallet2 size={18} aria-hidden />}
              title="Đơn đã thanh toán"
              value={currentMetrics.paidOrders.toLocaleString('vi-VN')}
              change={formatPercentChange(currentMetrics.paidOrders, lastMetrics.paidOrders)}
            />
          </li>
        </ul>

        <AnalyticsSalesChart data={salesData} />

        {/* ── Traffic sources ── */}
        <section className="dash-table-group">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Nguồn truy cập</h2>
            <p className="dash__shortcuts-subtitle">
              Lượt truy cập và chuyển đổi theo kênh trong kỳ này.
            </p>
          </header>
          <RankingTable
            title="Lượt truy cập theo nguồn"
            columns={[
              { key: 'source', label: 'Nguồn' },
              { key: 'sessions', label: 'Phiên', align: 'right' },
              { key: 'sharePct', label: 'Tỉ lệ', align: 'right' },
              { key: 'conversionPct', label: 'Tỉ lệ chuyển đổi', align: 'right' },
            ]}
            rows={trafficBySource.map((t) => ({
              source: t.source,
              sessions: t.sessions.toLocaleString('vi-VN'),
              sharePct: `${t.sharePct}%`,
              conversionPct: `${t.conversionPct}%`,
            }))}
          />
        </section>

        {/* ── Top sellers / bottom sellers ── */}
        <div className="dash__split">
          <RankingTable
            title="Bán chạy"
            columns={[
              { key: 'product', label: 'Sản phẩm' },
              { key: 'units', label: 'Đã bán', align: 'right' },
              { key: 'revenue', label: 'Doanh thu', align: 'right' },
            ]}
            rows={productPerformance.topSellers.map((p) => ({
              product: p.productTitle || p.productHandle,
              units: p.units.toLocaleString('vi-VN'),
              revenue: formatVnd(p.revenueVnd),
            }))}
          />
          <RankingTable
            title="Bán chậm"
            columns={[
              { key: 'product', label: 'Sản phẩm' },
              { key: 'units', label: 'Đã bán', align: 'right' },
              { key: 'revenue', label: 'Doanh thu', align: 'right' },
            ]}
            rows={productPerformance.bottomSellers.map((p) => ({
              product: p.productTitle || p.productHandle,
              units: p.units.toLocaleString('vi-VN'),
              revenue: formatVnd(p.revenueVnd),
            }))}
          />
        </div>

        {/* ── Xem nhiều mua ít (high attention, low conversion) ── */}
        <section className="dash-table-group">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Xem nhiều mua ít</h2>
            <p className="dash__shortcuts-subtitle">
              Sản phẩm có nhiều lượt xem nhưng tỉ lệ mua thấp — cần cải thiện
              chuyển đổi.
            </p>
          </header>
          <RankingTable
            title="Sản phẩm cần chú ý"
            columns={[
              { key: 'product', label: 'Sản phẩm' },
              { key: 'views', label: 'Lượt xem', align: 'right' },
              { key: 'conversionPct', label: 'Tỉ lệ mua', align: 'right' },
            ]}
            rows={productPerformance.viewToBuy
              .filter((v) => v.highAttentionLowConversion)
              .map((v) => ({
                product: v.productTitle || v.productHandle,
                views: v.views.toLocaleString('vi-VN'),
                conversionPct: `${v.conversionPct}%`,
              }))}
            emptyLabel="Không có sản phẩm nào cần chú ý."
          />
        </section>

        {/* ── Lượt xem & thời gian xem TB ── */}
        <section className="dash-table-group">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Lượt xem &amp; thời gian xem TB</h2>
            <p className="dash__shortcuts-subtitle">
              Sản phẩm được xem nhiều nhất và thời gian xem trung bình.
            </p>
          </header>
          <RankingTable
            title="Lượt xem & thời gian xem TB"
            columns={[
              { key: 'product', label: 'Sản phẩm' },
              { key: 'views', label: 'Lượt xem', align: 'right' },
              { key: 'avgDwellMs', label: 'TG xem TB', align: 'right' },
            ]}
            rows={productPerformance.viewToBuy.map((v) => ({
              product: v.productTitle || v.productHandle,
              views: v.views.toLocaleString('vi-VN'),
              avgDwellMs: `${Math.round(v.avgDwellMs / 1000)}s`,
            }))}
            emptyLabel="Chưa có lượt xem nào."
          />
        </section>

        {/* ── Discounted-item report ── */}
        <section className="dash-table-group">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Sản phẩm khuyến mãi</h2>
            <p className="dash__shortcuts-subtitle">
              Hiệu quả của các sản phẩm đang giảm giá trong kỳ.
            </p>
          </header>
          <RankingTable
            title="Sản phẩm đang giảm giá"
            columns={[
              { key: 'product', label: 'Sản phẩm' },
              { key: 'salePercent', label: 'Giảm', align: 'right' },
              { key: 'units', label: 'Đã bán', align: 'right' },
              { key: 'revenue', label: 'Doanh thu', align: 'right' },
            ]}
            rows={discounted.map((d) => ({
              product: d.title || d.slug,
              salePercent: `${d.salePercent}%`,
              units: d.units.toLocaleString('vi-VN'),
              revenue: formatVnd(d.revenueVnd),
            }))}
            emptyLabel="Chưa có sản phẩm nào đang giảm giá."
          />
        </section>

        {/* ── Cart abandonment ── */}
        <section className="dash-table-group">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Giỏ hàng bị bỏ quên</h2>
            <p className="dash__shortcuts-subtitle">
              Số giỏ có sản phẩm nhưng chưa thanh toán trong kỳ.
            </p>
          </header>
          <ul className="dash__metrics">
            <li><MetricCard tone="orders" icon={<ShoppingBag size={18} aria-hidden />} title="Giỏ bị bỏ" value={cart.abandonment.abandoned.toLocaleString('vi-VN')} change={formatPercentChange(cart.abandonment.abandoned, lastCart.abandonment.abandoned)} /></li>
            <li><MetricCard tone="paid" icon={<Wallet2 size={18} aria-hidden />} title="Giỏ hoàn tất" value={cart.abandonment.completed.toLocaleString('vi-VN')} change={formatPercentChange(cart.abandonment.completed, lastCart.abandonment.completed)} /></li>
            <li><MetricCard tone="value" icon={<Receipt size={18} aria-hidden />} title="Tỉ lệ bỏ giỏ" value={`${cart.abandonment.abandonmentPct}%`} change={formatPercentChange(cart.abandonment.abandonmentPct, lastCart.abandonment.abandonmentPct)} /></li>
            <li><MetricCard tone="revenue" icon={<Wallet size={18} aria-hidden />} title="Thêm giỏ → mua" value={`${cart.funnel.conversionPct}%`} change={formatPercentChange(cart.funnel.conversionPct, lastCart.funnel.conversionPct)} /></li>
          </ul>
        </section>

        {/* ── Click-through rate ── */}
        <section className="dash-table-group">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Tỷ lệ nhấp (CTR)</h2>
            <p className="dash__shortcuts-subtitle">
              Lượt hiển thị trong danh sách so với lượt nhấp vào sản phẩm.
            </p>
          </header>
          <RankingTable
            title="Tỷ lệ nhấp theo sản phẩm"
            columns={[
              { key: 'product', label: 'Sản phẩm' },
              { key: 'impressions', label: 'Hiển thị', align: 'right' },
              { key: 'clicks', label: 'Nhấp', align: 'right' },
              { key: 'ctr', label: 'CTR', align: 'right' },
            ]}
            rows={ctr.map((c) => ({
              product: titleFor(c.productId),
              impressions: c.impressions.toLocaleString('vi-VN'),
              clicks: c.clicks.toLocaleString('vi-VN'),
              ctr: `${c.ctrPct}%`,
            }))}
            emptyLabel="Chưa đủ dữ liệu hiển thị."
          />
        </section>

        <section className="dash__shortcuts">
          <header className="dash__shortcuts-head">
            <h2 className="dash__shortcuts-title">Lối tắt quản lý</h2>
            <p className="dash__shortcuts-subtitle">Truy cập nhanh các công cụ vận hành cửa hàng.</p>
          </header>
          <ul className="dash__tiles">
            {actionTiles.map((tile) => (
              <li key={tile.href}>
                <a className="dash-tile" href={tile.href}>
                  <span className="dash-tile__icon" aria-hidden>
                    {tile.icon}
                  </span>
                  <span className="dash-tile__body">
                    <span className="dash-tile__label">{tile.label}</span>
                    <span className="dash-tile__description">{tile.description}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Gutter>
  );
}

export default AnalyticsDashboard;
