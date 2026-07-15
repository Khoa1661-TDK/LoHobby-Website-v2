import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn();
vi.mock('@/lib/email/client', () => ({
  getEmailConfig: vi.fn(),
  getTransporter: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { sendEmail } from '@/lib/email/send';
import { getEmailConfig, getTransporter } from '@/lib/email/client';
import { logger } from '@/lib/logger';

const getEmailConfigMock = vi.mocked(getEmailConfig);
const getTransporterMock = vi.mocked(getTransporter);

const args = { to: 'buyer@example.com', subject: 'Hi', text: 'hi', html: '<p>hi</p>' };

const configured = {
  configured: true as const,
  user: 'shop@gmail.com',
  appPassword: 'abcd efgh ijkl mnop',
  from: 'Shop <shop@gmail.com>',
};

beforeEach(() => {
  getEmailConfigMock.mockReturnValue(configured);
  getTransporterMock.mockReturnValue({ sendMail: sendMailMock } as never);
});

afterEach(() => vi.clearAllMocks());

describe('sendEmail', () => {
  it('should skip the send and report unconfigured when credentials are missing', async () => {
    getEmailConfigMock.mockReturnValue({
      configured: false, user: '', appPassword: '', from: '',
    });
    getTransporterMock.mockReturnValue(null);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: false, sent: false });
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('should send to the single recipient and report success', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'abc' });

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: true });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'Shop <shop@gmail.com>',
      to: 'buyer@example.com',
      subject: 'Hi',
      text: 'hi',
      html: '<p>hi</p>',
    });
  });

  it('should report failure and log a warning when the transport rejects', async () => {
    sendMailMock.mockRejectedValue(new Error('535 auth failed'));

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
