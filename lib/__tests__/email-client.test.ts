import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEmailConfig, sendBulkEmail } from '@/lib/email/client';

function okResponse() {
  return { ok: true, json: async () => ({ data: [] }) };
}
function errResponse() {
  return { ok: false, status: 422, json: async () => ({ message: 'invalid' }) };
}

function emails(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `user${i}@example.com`);
}

describe('getEmailConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('should be unconfigured when RESEND_API_KEY is missing', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', 'shop@example.com');
    expect(getEmailConfig().configured).toBe(false);
  });

  it('should be unconfigured when EMAIL_FROM is missing', () => {
    vi.stubEnv('RESEND_API_KEY', 're_123');
    vi.stubEnv('EMAIL_FROM', '');
    expect(getEmailConfig().configured).toBe(false);
  });

  it('should be configured when both env vars are present', () => {
    vi.stubEnv('RESEND_API_KEY', 're_123');
    vi.stubEnv('EMAIL_FROM', 'shop@example.com');
    const config = getEmailConfig();
    expect(config.configured).toBe(true);
    expect(config.from).toBe('shop@example.com');
  });
});

describe('sendBulkEmail', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should be inert and never call fetch when not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', '');
    const result = await sendBulkEmail({
      subject: 's',
      text: 't',
      html: '<p>t</p>',
      recipients: emails(3),
    });
    expect(result).toEqual({ configured: false, sent: 0, failed: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should chunk recipients into batches of 100', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_123');
    vi.stubEnv('EMAIL_FROM', 'shop@example.com');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse());

    const result = await sendBulkEmail({
      subject: 's',
      text: 't',
      html: '<p>t</p>',
      recipients: emails(101),
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ configured: true, sent: 101, failed: 0 });
  });

  it('should count a failed chunk as failed and keep the rest as sent', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_123');
    vi.stubEnv('EMAIL_FROM', 'shop@example.com');
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(errResponse());

    const result = await sendBulkEmail({
      subject: 's',
      text: 't',
      html: '<p>t</p>',
      recipients: emails(101),
    });

    expect(result).toEqual({ configured: true, sent: 100, failed: 1 });
  });

  it('should count a thrown network error as failed without throwing', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_123');
    vi.stubEnv('EMAIL_FROM', 'shop@example.com');
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

    const result = await sendBulkEmail({
      subject: 's',
      text: 't',
      html: '<p>t</p>',
      recipients: emails(2),
    });

    expect(result).toEqual({ configured: true, sent: 0, failed: 2 });
  });
});
