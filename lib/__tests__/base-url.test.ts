import { describe, expect, it } from 'vitest';
import { resolveBaseUrl } from '@/lib/utils';

describe('resolveBaseUrl', () => {
  it('should prefer the runtime APP_URL over baked NEXT_PUBLIC_* vars', () => {
    const url = resolveBaseUrl({
      APP_URL: 'https://yourshop.com',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    });
    expect(url).toBe('https://yourshop.com');
  });

  it('should fall back to NEXT_PUBLIC_APP_URL when APP_URL is unset', () => {
    const url = resolveBaseUrl({ NEXT_PUBLIC_APP_URL: 'https://shop.example' });
    expect(url).toBe('https://shop.example');
  });

  it('should fall back to NEXT_PUBLIC_SITE_URL when APP_URL and APP url are unset', () => {
    const url = resolveBaseUrl({ NEXT_PUBLIC_SITE_URL: 'https://site.example' });
    expect(url).toBe('https://site.example');
  });

  it('should prepend https:// when the configured value has no scheme', () => {
    const url = resolveBaseUrl({ APP_URL: 'yourshop.com' });
    expect(url).toBe('https://yourshop.com');
  });

  it('should default to localhost when nothing is configured', () => {
    const url = resolveBaseUrl({});
    expect(url).toBe('http://localhost:3000');
  });
});
