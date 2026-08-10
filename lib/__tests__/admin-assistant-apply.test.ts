import { describe, expect, it, vi } from 'vitest';
import { applyProposal, parseProposal } from '@/lib/admin-assistant/apply';
import type { Proposal } from '@/lib/admin-assistant/types';

function deps() {
  return {
    payload: { update: vi.fn().mockResolvedValue({}), updateGlobal: vi.fn().mockResolvedValue({}) } as never,
    locale: 'vi' as const,
    runOrderAction: vi.fn().mockResolvedValue({ ok: true, message: 'Đã xác nhận đơn #1042.' }),
  };
}

describe('parseProposal', () => {
  it('should accept a well-formed order proposal', () => {
    const proposal = {
      kind: 'orderAction',
      docId: 11,
      orderCode: 1042,
      action: 'confirm',
      summary: 'x',
    };
    expect(parseProposal(proposal)).toMatchObject({ kind: 'orderAction', action: 'confirm' });
  });

  it('should reject an unknown proposal kind', () => {
    expect(parseProposal({ kind: 'dropDatabase' })).toBeNull();
  });

  it('should reject a tampered product field', () => {
    expect(
      parseProposal({ kind: 'productUpdate', id: 5, fields: { slug: 'x' }, summary: 'x' }),
    ).toBeNull();
  });

  it('should reject a tampered global slug', () => {
    expect(
      parseProposal({ kind: 'settingsUpdate', global: 'users', fields: { a: 1 }, summary: 'x' }),
    ).toBeNull();
  });

  it('should reject a ship proposal with no shipment input', () => {
    expect(
      parseProposal({ kind: 'orderAction', docId: 1, orderCode: 2, action: 'ship', summary: 'x' }),
    ).toBeNull();
  });

  it('should reject a non-object', () => {
    expect(parseProposal('confirm everything')).toBeNull();
  });
});

describe('applyProposal', () => {
  it('should route an order action through runOrderAction', async () => {
    const d = deps();
    const proposal: Proposal = {
      kind: 'orderAction',
      docId: 11,
      orderCode: 1042,
      action: 'confirm',
      summary: 'x',
    };
    const result = await applyProposal(proposal, d);
    expect(d.runOrderAction).toHaveBeenCalledWith(11, 'confirm', undefined);
    expect(result.ok).toBe(true);
  });

  it('should update product fields through payload', async () => {
    const d = deps();
    await applyProposal(
      { kind: 'productUpdate', id: 5, fields: { price: 99000 }, summary: 'x' },
      d,
    );
    expect((d.payload as unknown as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'products', id: 5, data: { price: 99000 } }),
    );
  });

  it('should write gallery rows in payload array shape', async () => {
    const d = deps();
    await applyProposal({ kind: 'productImages', id: 5, gallery: [9, 10], summary: 'x' }, d);
    expect((d.payload as unknown as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { gallery: [{ media: 9 }, { media: 10 }] } }),
    );
  });

  it('should expand a dotted settings path into a nested object', async () => {
    const d = deps();
    await applyProposal(
      { kind: 'settingsUpdate', global: 'store-settings', fields: { 'contact.email': 'a@b.com' }, summary: 'x' },
      d,
    );
    expect(
      (d.payload as unknown as { updateGlobal: ReturnType<typeof vi.fn> }).updateGlobal,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'store-settings', data: { contact: { email: 'a@b.com' } } }),
    );
  });

  it('should report a failed order action', async () => {
    const d = deps();
    d.runOrderAction = vi.fn().mockResolvedValue({ ok: false, message: 'Không hợp lệ.' });
    const result = await applyProposal(
      { kind: 'orderAction', docId: 11, orderCode: 1042, action: 'cancel', summary: 'x' },
      d,
    );
    expect(result).toEqual({ ok: false, message: 'Không hợp lệ.' });
  });
});
