import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { getEmailConfig, sendBulkEmail, resetTransporter } from '@/lib/email/client';

function emails(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `user${i}@example.com`);
}

beforeEach(() => {
  vi.stubEnv('GMAIL_USER', 'shop@gmail.com');
  vi.stubEnv('GMAIL_APP_PASSWORD', 'abcd efgh ijkl mnop');
  vi.stubEnv('EMAIL_FROM', 'Shop <shop@gmail.com>');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  resetTransporter();
});

describe('getEmailConfig', () => {
  it('should be unconfigured when GMAIL_USER is missing', () => {
    vi.stubEnv('GMAIL_USER', '');
    expect(getEmailConfig().configured).toBe(false);
  });

  it('should be unconfigured when GMAIL_APP_PASSWORD is missing', () => {
    vi.stubEnv('GMAIL_APP_PASSWORD', '');
    expect(getEmailConfig().configured).toBe(false);
  });

  it('should be configured when both credentials are present', () => {
    const config = getEmailConfig();
    expect(config.configured).toBe(true);
    expect(config.user).toBe('shop@gmail.com');
    expect(config.from).toBe('Shop <shop@gmail.com>');
  });

  it('should fall back to GMAIL_USER as the sender when EMAIL_FROM is unset', () => {
    vi.stubEnv('EMAIL_FROM', '');
    expect(getEmailConfig().from).toBe('shop@gmail.com');
  });
});

describe('sendBulkEmail', () => {
  it('should be inert and never touch the transport when not configured', async () => {
    vi.stubEnv('GMAIL_APP_PASSWORD', '');

    const result = await sendBulkEmail({
      subject: 's', text: 't', html: '<p>t</p>', recipients: emails(3),
    });

    expect(result).toEqual({ configured: false, sent: 0, failed: 0 });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should send one message per recipient and never expose addresses to each other', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'x' });

    const result = await sendBulkEmail({
      subject: 's', text: 't', html: '<p>t</p>', recipients: emails(3),
    });

    expect(result).toEqual({ configured: true, sent: 3, failed: 0 });
    expect(sendMailMock).toHaveBeenCalledTimes(3);
    for (const call of sendMailMock.mock.calls) {
      expect(call[0].to).toEqual(expect.stringMatching(/^user\d@example\.com$/));
      expect(call[0].bcc).toBeUndefined();
    }
  });

  it('should tally a per-recipient rejection as failed without aborting the rest', async () => {
    sendMailMock
      .mockResolvedValueOnce({ messageId: 'x' })
      .mockRejectedValueOnce(new Error('mailbox full'))
      .mockResolvedValueOnce({ messageId: 'z' });

    const result = await sendBulkEmail({
      subject: 's', text: 't', html: '<p>t</p>', recipients: emails(3),
    });

    expect(result).toEqual({ configured: true, sent: 2, failed: 1 });
    expect(sendMailMock).toHaveBeenCalledTimes(3);
  });
});
