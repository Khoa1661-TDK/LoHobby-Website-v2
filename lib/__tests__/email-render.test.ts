import { describe, it, expect } from 'vitest';
import { renderCampaignBody } from '@/lib/email/render';

describe('renderCampaignBody', () => {
  it('should keep the text part as the raw body', () => {
    const body = 'Hello <world> & "friends"\nSecond line';
    expect(renderCampaignBody(body).text).toBe(body);
  });

  it('should HTML-escape special characters in the html part', () => {
    const { html } = renderCampaignBody('a < b & c > d "q"');
    expect(html).toBe('a &lt; b &amp; c &gt; d &quot;q&quot;');
  });

  it('should convert newlines to <br> in the html part', () => {
    const { html } = renderCampaignBody('line one\nline two');
    expect(html).toBe('line one<br>line two');
  });

  it('should escape before converting newlines so injected markup is inert', () => {
    const { html } = renderCampaignBody('<script>\nalert(1)');
    expect(html).toBe('&lt;script&gt;<br>alert(1)');
  });
});
