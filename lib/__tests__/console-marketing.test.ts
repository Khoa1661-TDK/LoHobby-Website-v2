// lib/__tests__/console-marketing.test.ts
import { describe, it, expect } from 'vitest';
import { toAutoSaleProductRow, toCampaignRow, toCouponRow, toGiftCardRow } from '@/lib/console/marketing';

const BASE_COUPON = {
  id: 'c1',
  code: 'LOHOBBY10',
  discountType: 'PERCENT' as const,
  discountValue: 10,
  minOrderAmount: 0,
  maxUses: null,
  usedCount: 214,
  expiresAt: new Date('2026-08-31T02:14:00Z'),
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('toCouponRow', () => {
  it('should render a percent coupon with its expiry and redemption count', () => {
    expect(toCouponRow(BASE_COUPON as never)).toEqual({
      id: 'c1',
      code: 'LOHOBBY10',
      value: '10%',
      validity: 'đến 31/08',
      used: '214',
    });
  });

  it('should render a fixed coupon value in dong', () => {
    const row = toCouponRow({
      ...BASE_COUPON,
      discountType: 'FIXED',
      discountValue: 50000,
    } as never);
    expect(row.value).toBe('50.000 ₫');
  });

  it('should say unlimited when the coupon has no expiry', () => {
    expect(toCouponRow({ ...BASE_COUPON, expiresAt: null } as never).validity).toBe(
      'không giới hạn',
    );
  });

  it('should say disabled when the coupon is turned off', () => {
    expect(toCouponRow({ ...BASE_COUPON, enabled: false } as never).validity).toBe('đã tắt');
  });

  it('should show the redemption cap when one is set', () => {
    expect(toCouponRow({ ...BASE_COUPON, maxUses: 500 } as never).used).toBe('214/500');
  });
});

describe('toGiftCardRow', () => {
  it('should show the remaining balance on a partly spent card', () => {
    expect(
      toGiftCardRow({
        id: 'g1',
        code: 'GC-88213',
        initialBalance: 200000,
        balance: 120000,
        usedAmount: 80000,
        expiresAt: null,
        enabled: true,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never),
    ).toEqual({
      id: 'g1',
      code: 'GC-88213',
      value: '200.000 ₫',
      note: 'còn 120.000 ₫',
      exhausted: false,
    });
  });

  it('should mark a zero-balance card exhausted', () => {
    const row = toGiftCardRow({
      id: 'g2',
      code: 'GC-88190',
      initialBalance: 100000,
      balance: 0,
      usedAmount: 100000,
      expiresAt: null,
      enabled: true,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect(row.exhausted).toBe(true);
    expect(row.note).toBe('đã dùng hết');
  });
});

describe('toCampaignRow', () => {
  const BASE_CAMPAIGN = {
    id: 'm1',
    name: 'Tháng 8',
    subject: 'Khuyến mãi tháng 8 — giảm 15%',
    body: '',
    status: 'SENT' as const,
    scheduledAt: null,
    sentAt: new Date('2026-08-20T02:14:00Z'),
    recipientCount: 480,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should map a sent campaign to the sent status', () => {
    expect(toCampaignRow(BASE_CAMPAIGN as never)).toEqual({
      id: 'm1',
      subject: 'Khuyến mãi tháng 8 — giảm 15%',
      status: 'sent',
    });
  });

  it('should map a scheduled campaign to the scheduled status', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'SCHEDULED' } as never).status).toBe(
      'scheduled',
    );
  });

  it('should map a cancelled campaign to the cancelled status rather than to draft', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'CANCELLED' } as never).status).toBe(
      'cancelled',
    );
  });

  it('should fall back to draft when the status is unrecognised', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, status: 'WEIRD' } as never).status).toBe('draft');
  });

  it('should fall back to the campaign name when the subject is empty', () => {
    expect(toCampaignRow({ ...BASE_CAMPAIGN, subject: '' } as never).subject).toBe('Tháng 8');
  });
});

describe('toAutoSaleProductRow', () => {
  it('should render the price and the applied discount', () => {
    expect(
      toAutoSaleProductRow({
        id: 12,
        title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
        category: [],
        price: 129000,
        salePercent: 15,
        updatedAt: '',
        createdAt: '',
      } as never),
    ).toEqual({
      id: '12',
      title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      price: '129.000 ₫',
      discount: '−15%',
    });
  });

  it('should render a zero discount when salePercent is unset', () => {
    const row = toAutoSaleProductRow({
      id: 13,
      title: 'Mô Hình Máy Bay Tiêm Kích J20',
      category: [],
      price: 269000,
      salePercent: null,
      updatedAt: '',
      createdAt: '',
    } as never);
    expect(row.discount).toBe('−0%');
  });
});
