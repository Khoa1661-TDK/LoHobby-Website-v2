import { afterEach, describe, expect, it, vi } from 'vitest';

const findMock = vi.fn();

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ find: findMock })),
}));

import { getGatewayConfigForMethod } from '@/lib/payment-gateway-credentials';

afterEach(() => {
  vi.clearAllMocks();
});

describe('getGatewayConfigForMethod for the demo provider', () => {
  it('should resolve trivial demo credentials with no stored blob', async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ provider: 'demo', gatewayCredentials: { credentialsEnc: null } }],
    });

    const config = await getGatewayConfigForMethod('demo');

    expect(config).toEqual({ credentials: { provider: 'demo' }, sandboxMode: true });
  });
});
