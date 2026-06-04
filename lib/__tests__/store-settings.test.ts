import { describe, expect, it, vi } from 'vitest';
import { resolveChatConfig, type ChatConfig } from '@/lib/store-settings';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

describe('resolveChatConfig', () => {
  it('should disable the whole widget when chatEnabled is false', () => {
    const result = resolveChatConfig({
      chatEnabled: false,
      zaloChatEnabled: true,
      zaloOaId: '123',
      messengerChatEnabled: true,
      fbPageId: '456',
    });
    expect(result.enabled).toBe(false);
  });

  it('should null the zalo platform when enabled but oaId is blank', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      zaloChatEnabled: true,
      zaloOaId: '   ',
    });
    expect(result.zalo).toBeNull();
  });

  it('should null the messenger platform when enabled but fbPageId is blank', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      messengerChatEnabled: true,
      fbPageId: '',
    });
    expect(result.messenger).toBeNull();
  });

  it('should trim whitespace from oaId and pageId', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      zaloChatEnabled: true,
      zaloOaId: '  oa-9 ',
      messengerChatEnabled: true,
      fbPageId: ' 42 ',
    });
    expect(result.zalo?.oaId).toBe('oa-9');
    expect(result.messenger?.pageId).toBe('42');
  });

  it('should return both platforms when both are enabled with valid ids', () => {
    const result = resolveChatConfig({
      chatEnabled: true,
      zaloChatEnabled: true,
      zaloOaId: 'oa-1',
      zaloWelcomeMessage: 'Xin chào',
      messengerChatEnabled: true,
      fbPageId: 'page-1',
      messengerThemeColor: '#2563eb',
      messengerGreeting: 'Hi there',
    });
    const expected: ChatConfig = {
      enabled: true,
      zalo: { oaId: 'oa-1', welcomeMessage: 'Xin chào' },
      messenger: { pageId: 'page-1', themeColor: '#2563eb', greeting: 'Hi there' },
    };
    expect(result).toEqual(expected);
  });

  it('should fall back to all-off defaults when raw is null', () => {
    const result = resolveChatConfig(null);
    expect(result).toEqual({ enabled: false, zalo: null, messenger: null });
  });

  it('should keep enabled true but both platforms null when ids are missing', () => {
    const result = resolveChatConfig({ chatEnabled: true });
    expect(result.enabled).toBe(true);
    expect(result.zalo).toBeNull();
    expect(result.messenger).toBeNull();
  });
});
