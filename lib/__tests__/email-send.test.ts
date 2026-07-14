import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email/client', () => ({ getEmailConfig: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

import { sendEmail } from '@/lib/email/send';
import { getEmailConfig } from '@/lib/email/client';
import { logger } from '@/lib/logger';

const getEmailConfigMock = vi.mocked(getEmailConfig);
const fetchMock = vi.fn();

const args = { to: 'buyer@example.com', subject: 'Hi', text: 'hi', html: '<p>hi</p>' };

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('sendEmail', () => {
  it('should skip the network call and report unconfigured when credentials are missing', async () => {
    getEmailConfigMock.mockReturnValue({ configured: false, apiKey: '', from: '' });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: false, sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('should send a single-recipient request and report success on a 2xx response', async () => {
    getEmailConfigMock.mockReturnValue({
      configured: true,
      apiKey: 'key_test',
      from: 'Shop <shop@example.com>',
    });
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn() });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key_test' }),
        body: JSON.stringify({
          from: 'Shop <shop@example.com>',
          to: ['buyer@example.com'],
          subject: 'Hi',
          text: 'hi',
          html: '<p>hi</p>',
        }),
      }),
    );
  });

  it('should report failure and log a warning on a non-2xx response', async () => {
    getEmailConfigMock.mockReturnValue({ configured: true, apiKey: 'key_test', from: 'shop@example.com' });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ message: 'bad' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should report failure and log a warning when the network call throws', async () => {
    getEmailConfigMock.mockReturnValue({ configured: true, apiKey: 'key_test', from: 'shop@example.com' });
    fetchMock.mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
