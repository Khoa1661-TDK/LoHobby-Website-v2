import { describe, it, expect, vi } from 'vitest';
import type { Payload } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { buildOrderEmbed, buildConfirmComponents, notifyNewOrder } from '@/lib/discord/order-notification';

function sampleOrder(): Order {
  return {
    id: 42,
    orderId: '1007',
    totalAmount: 250000,
    currency: 'VND',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '0901234567',
    paymentMethodKey: 'cod',
    lineItems: [
      { productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 100000 },
      { productId: 'p2', productTitle: 'Nón', quantity: 1, unitPrice: 50000 },
    ],
  } as Order;
}

describe('buildOrderEmbed', () => {
  it('should put the order code in the title and VND-formatted total in a field', () => {
    const embed = buildOrderEmbed(sampleOrder());
    expect(embed.title).toContain('#1007');
    const total = embed.fields?.find((f) => f.name === 'Tổng tiền');
    expect(total?.value).toBe('250.000₫');
  });

  it('should include customer name and phone fields when present', () => {
    const embed = buildOrderEmbed(sampleOrder());
    const flat = JSON.stringify(embed.fields);
    expect(flat).toContain('Nguyễn Văn A');
    expect(flat).toContain('0901234567');
  });

  it('should list every line item with quantity', () => {
    const embed = buildOrderEmbed(sampleOrder());
    const items = embed.fields?.find((f) => f.name === 'Sản phẩm');
    expect(items?.value).toContain('Áo thun x2');
    expect(items?.value).toContain('Nón x1');
  });

  it('should link the embed to the admin order page', () => {
    const embed = buildOrderEmbed(sampleOrder());
    expect(embed.url).toContain('/admin/collections/orders/42');
  });
});

describe('buildConfirmComponents', () => {
  it('should encode the order doc id in the button custom_id', () => {
    const components = buildConfirmComponents(sampleOrder());
    const button = components[0]!.components[0]!;
    expect(button.custom_id).toBe('confirm_order:42');
    expect(button.label).toContain('Xác nhận');
  });
});

describe('notifyNewOrder', () => {
  it('should not call fetch when Discord notifications are disabled', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const payload = {
      findGlobal: vi.fn().mockResolvedValue({ discordEnabled: false }),
    } as unknown as Payload;

    await notifyNewOrder({ payload, order: sampleOrder() });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('should POST to the channel messages endpoint with a Bot token when enabled', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
    const payload = {
      findGlobal: vi.fn().mockResolvedValue({
        discordEnabled: true,
        discordBotToken: 'tok',
        discordChannelId: '999',
        discordPublicKey: 'pk',
        discordAllowedUserIds: '1',
      }),
    } as unknown as Payload;

    await notifyNewOrder({ payload, order: sampleOrder() });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('https://discord.com/api/v10/channels/999/messages');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bot tok');
    fetchSpy.mockRestore();
  });
});
