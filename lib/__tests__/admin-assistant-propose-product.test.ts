import { describe, expect, it, vi } from 'vitest';
import { proposeProductImagesTool } from '@/lib/admin-assistant/tools/propose-product-images';
import { proposeProductUpdateTool } from '@/lib/admin-assistant/tools/propose-product-update';
import type { Proposal, ToolContext } from '@/lib/admin-assistant/types';

function ctx(product: unknown = { id: 5, title: 'Khung ảnh' }, media: unknown[] = [{ id: 9 }]): ToolContext {
  return {
    payload: {
      findByID: vi.fn().mockImplementation(async ({ collection }: { collection: string }) =>
        collection === 'products' ? product : null,
      ),
      find: vi.fn().mockResolvedValue({ docs: media }),
      update: vi.fn(),
    } as never,
    locale: 'vi',
  };
}

describe('proposeProductUpdateTool', () => {
  it('should stage whitelisted fields without writing', async () => {
    const context = ctx();
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { price: 99000 } }, context);
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({ kind: 'productUpdate', id: 5, fields: { price: 99000 } });
    expect((context.payload as unknown as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled();
  });

  it('should reject a field outside the whitelist', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { slug: 'hack' } }, ctx());
    expect(outcome.content).toContain('ERROR:');
    expect(outcome.emit).toBeUndefined();
  });

  it('should reject a negative price', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { price: -1 } }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a salePercent outside 0-100', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { salePercent: 150 } }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a non-numeric category id', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { category: 'trang-tri' } }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject an empty field set', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: {} }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should error when the product does not exist', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { price: 1 } }, ctx(null));
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('proposeProductImagesTool', () => {
  it('should stage a main image change', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5, image: 9 }, ctx());
    expect(outcome.emit).toMatchObject({ kind: 'productImages', id: 5, image: 9 });
  });

  it('should stage a gallery change', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5, gallery: [9] }, ctx());
    expect(outcome.emit).toMatchObject({ kind: 'productImages', gallery: [9] });
  });

  it('should reject a media id that does not exist', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5, image: 404 }, ctx(undefined, []));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a call that changes neither image nor gallery', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5 }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });
});
