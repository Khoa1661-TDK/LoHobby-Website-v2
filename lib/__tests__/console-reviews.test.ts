// lib/__tests__/console-reviews.test.ts
import { describe, it, expect } from 'vitest';
import { toMessageRow, toReviewRow, type ReviewWithUser } from '@/lib/console/reviews';

function makeReview(overrides: Partial<ReviewWithUser> = {}): ReviewWithUser {
  return {
    id: 'rev1',
    userId: 'u1',
    productId: '12',
    productHandle: 'moc-khoa-totem',
    rating: 4,
    title: null,
    body: 'Mô hình rất chi tiết, đóng gói cẩn thận. Giao nhanh.',
    approved: false,
    createdAt: new Date('2026-08-20T02:14:00Z'),
    updatedAt: new Date('2026-08-20T02:14:00Z'),
    user: { name: 'Lê Minh Anh', email: 'anh@email.com' },
    ...overrides,
  } as ReviewWithUser;
}

describe('toReviewRow', () => {
  it('should map a review with a named author to its console row', () => {
    expect(toReviewRow(makeReview())).toEqual({
      id: 'rev1',
      author: 'Lê Minh Anh',
      rating: 4,
      body: 'Mô hình rất chi tiết, đóng gói cẩn thận. Giao nhanh.',
    });
  });

  it('should fall back to the author email when the user has no name', () => {
    const row = toReviewRow(makeReview({ user: { name: null, email: 'anh@email.com' } }));
    expect(row.author).toBe('anh@email.com');
  });

  it('should render the anonymous label when the user relation is null', () => {
    expect(toReviewRow(makeReview({ user: null })).author).toBe('Khách ẩn danh');
  });

  it('should clamp a rating above five down to five', () => {
    expect(toReviewRow(makeReview({ rating: 9 })).rating).toBe(5);
  });

  it('should clamp a negative rating up to zero', () => {
    expect(toReviewRow(makeReview({ rating: -2 })).rating).toBe(0);
  });
});

describe('toMessageRow', () => {
  it('should use the order code as the subject when the message references an order', () => {
    const row = toMessageRow({
      id: 'msg1',
      name: 'Trần Văn Đức',
      email: 'duc@email.com',
      orderCode: '2030',
      message: 'Đơn của tôi khi nào giao?',
      createdAt: new Date('2026-08-20T02:14:00Z'),
    });
    expect(row).toEqual({
      id: 'msg1',
      sender: 'Trần Văn Đức',
      subject: 'Về đơn #DH-2030',
      body: 'Đơn của tôi khi nào giao?',
    });
  });

  it('should use the sender email as the subject when there is no order code', () => {
    const row = toMessageRow({
      id: 'msg2',
      name: 'Vũ Thị Lan',
      email: 'lan@email.com',
      orderCode: null,
      message: 'Shop còn hàng không ạ?',
      createdAt: new Date('2026-08-20T02:14:00Z'),
    });
    expect(row.subject).toBe('lan@email.com');
  });
});
