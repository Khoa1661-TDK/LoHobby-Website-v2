// lib/__tests__/console-dashboard.test.ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { buildFunnel, buildRevenueSeries, toRecentOrder } from '@/lib/console/dashboard';

describe('buildRevenueSeries', () => {
  it('should spread points evenly across the fixed 540-wide coordinate space', () => {
    const series = buildRevenueSeries([
      { date: '2026-08-19', revenueVnd: 0 },
      { date: '2026-08-20', revenueVnd: 100000 },
    ]);
    expect(series.points).toBe('0,180 540,0');
    expect(series.area).toBe('0,180 540,0 540,200 0,200');
    expect(series.days).toEqual(['19/08', '20/08']);
  });

  it('should render a flat line at the bottom when every day is zero', () => {
    const series = buildRevenueSeries([
      { date: '2026-08-19', revenueVnd: 0 },
      { date: '2026-08-20', revenueVnd: 0 },
    ]);
    expect(series.points).toBe('0,180 540,180');
  });

  it('should return an empty series when given a single day', () => {
    expect(buildRevenueSeries([{ date: '2026-08-20', revenueVnd: 5 }])).toEqual({
      points: '',
      area: '',
      days: [],
    });
  });

  it('should return an empty series when given no days', () => {
    expect(buildRevenueSeries([])).toEqual({ points: '', area: '', days: [] });
  });
});

describe('buildFunnel', () => {
  it('should render three stages with widths and drop-offs', () => {
    const stages = buildFunnel(8204, 2610, 227);
    expect(stages).toHaveLength(3);
    expect(stages.map((s) => s.label)).toEqual([
      'Lượt xem sản phẩm',
      'Thêm giỏ hàng',
      'Mua hàng',
    ]);
    expect(stages.map((s) => s.value)).toEqual(['8.204', '2.610', '227']);
    expect(stages.map((s) => s.width)).toEqual(['100%', '32%', '3%']);
    expect(stages.at(-1)?.drop).toBeUndefined();
  });

  it('should express the drop-off from views to carts as a percentage', () => {
    expect(buildFunnel(8204, 2610, 227).at(0)?.drop).toBe('↓ 68,2%');
  });

  it('should floor a tiny stage width so the bar stays visible', () => {
    expect(buildFunnel(10000, 5000, 1).at(2)?.width).toBe('2%');
  });

  it('should render zero counts and no drop-offs when there is no traffic', () => {
    const stages = buildFunnel(0, 0, 0);
    expect(stages.map((s) => s.value)).toEqual(['0', '0', '0']);
    expect(stages.map((s) => s.drop)).toEqual([undefined, undefined, undefined]);
  });
});

describe('toRecentOrder', () => {
  function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 1,
      orderId: '2031',
      totalAmount: 450000,
      currency: 'VND',
      paymentStatus: 'paid',
      orderStatus: 'pending',
      customerName: 'Nguyễn Thị Hương',
      createdAt: '2026-08-20T02:14:00Z',
      updatedAt: '2026-08-20T02:14:00Z',
      ...overrides,
    } as Order;
  }

  it('should map a pending order to a wait-tone row', () => {
    expect(toRecentOrder(makeOrder())).toEqual({
      code: '#DH-2031',
      customer: 'Nguyễn Thị Hương',
      amount: '450.000 ₫',
      status: 'Đang chờ',
      tone: 'wait',
    });
  });

  it('should map a shipped order to a busy-tone row', () => {
    const row = toRecentOrder(makeOrder({ orderStatus: 'shipped' }));
    expect(row.status).toBe('Đang giao');
    expect(row.tone).toBe('busy');
  });

  it('should map a canceled order to a fail-tone cancelled row', () => {
    const row = toRecentOrder(makeOrder({ orderStatus: 'canceled' }));
    expect(row.status).toBe('Đã huỷ');
    expect(row.tone).toBe('fail');
  });
});
