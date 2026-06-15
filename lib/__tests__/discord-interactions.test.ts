import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMock = vi.fn();
const confirmOrderMock = vi.fn();
const getConfigMock = vi.fn();

vi.mock('@/lib/discord/verify', () => ({
  verifyDiscordSignature: (...args: unknown[]) => verifyMock(...args),
}));
vi.mock('@/lib/order-fulfillment', () => ({
  confirmOrder: (...args: unknown[]) => confirmOrderMock(...args),
}));
vi.mock('@/lib/discord/client', () => ({
  getDiscordConfig: (...args: unknown[]) => getConfigMock(...args),
}));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn().mockResolvedValue({}) }));

import { POST } from '@/app/api/discord/interactions/route';

function req(body: unknown): Request {
  return new Request('http://localhost/api/discord/interactions', {
    method: 'POST',
    headers: { 'X-Signature-Ed25519': 'sig', 'X-Signature-Timestamp': 'ts' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  verifyMock.mockReset();
  confirmOrderMock.mockReset();
  getConfigMock.mockReset();
  getConfigMock.mockResolvedValue({ publicKey: 'pk', allowedUserIds: ['1'] });
});

describe('POST /api/discord/interactions', () => {
  it('should return 401 when the signature is invalid', async () => {
    verifyMock.mockReturnValue(false);
    const res = await POST(req({ type: 1 }));
    expect(res.status).toBe(401);
    expect(confirmOrderMock).not.toHaveBeenCalled();
  });

  it('should answer PING with PONG', async () => {
    verifyMock.mockReturnValue(true);
    const res = await POST(req({ type: 1 }));
    const json = await res.json();
    expect(json.type).toBe(1);
  });

  it('should reject a user not in the allowlist with an ephemeral message', async () => {
    verifyMock.mockReturnValue(true);
    const res = await POST(
      req({
        type: 3,
        data: { custom_id: 'confirm_order:42' },
        member: { user: { id: '999' } },
      }),
    );
    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.flags).toBe(64);
    expect(confirmOrderMock).not.toHaveBeenCalled();
  });

  it('should confirm the order and update the message for an allowed user', async () => {
    verifyMock.mockReturnValue(true);
    confirmOrderMock.mockResolvedValue({ ok: true, order: { orderCode: 'A1' } });
    const res = await POST(
      req({
        type: 3,
        data: { custom_id: 'confirm_order:42' },
        member: { user: { id: '1' } },
      }),
    );
    const json = await res.json();
    expect(confirmOrderMock).toHaveBeenCalledWith('42');
    expect(json.type).toBe(7);
    expect(JSON.stringify(json.data)).toContain('Đã xác nhận');
  });

  it('should show the error message when confirmOrder fails', async () => {
    verifyMock.mockReturnValue(true);
    confirmOrderMock.mockResolvedValue({ ok: false, message: 'Đơn hàng đã bị hủy.' });
    const res = await POST(
      req({
        type: 3,
        data: { custom_id: 'confirm_order:42' },
        member: { user: { id: '1' } },
      }),
    );
    const json = await res.json();
    expect(json.type).toBe(7);
    expect(JSON.stringify(json.data)).toContain('Đơn hàng đã bị hủy.');
  });
});
