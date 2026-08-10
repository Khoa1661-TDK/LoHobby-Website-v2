import { describe, expect, it, vi } from 'vitest';
import { describeTargetTool } from '@/lib/admin-assistant/tools/describe-target';
import { readSettingsTool } from '@/lib/admin-assistant/tools/read-settings';
import type { ToolContext } from '@/lib/admin-assistant/types';

const globalFields = [
  { name: 'storeName', type: 'text' },
  { name: 'currency', type: 'select', options: [{ value: 'vnd' }, { value: 'usd' }] },
  { name: 'apiKey', type: 'text' },
];

function ctx(globalValue: Record<string, unknown> = {}): ToolContext {
  return {
    payload: {
      config: { globals: [{ slug: 'store-settings', fields: globalFields }] },
      findGlobal: vi.fn().mockResolvedValue(globalValue),
    } as never,
    locale: 'vi',
  };
}

describe('readSettingsTool', () => {
  it('should return current values keyed by path', async () => {
    const outcome = await readSettingsTool.run(
      { global: 'store-settings' },
      ctx({ storeName: 'Lô Hobby', currency: 'vnd', apiKey: 'sk-secret' }),
    );
    const values = JSON.parse(outcome.content) as Record<string, unknown>;
    expect(values.storeName).toBe('Lô Hobby');
    expect(values.currency).toBe('vnd');
  });

  it('should never return a credential field', async () => {
    const outcome = await readSettingsTool.run(
      { global: 'store-settings' },
      ctx({ storeName: 'Lô Hobby', apiKey: 'sk-secret' }),
    );
    expect(outcome.content).not.toContain('sk-secret');
    expect(outcome.content).not.toContain('apiKey');
  });

  it('should reject a global outside the writable set', async () => {
    const outcome = await readSettingsTool.run({ global: 'site-header' }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('describeTargetTool', () => {
  it('should list writable global fields with their enum values', async () => {
    const outcome = await describeTargetTool.run({ kind: 'store-settings' }, ctx());
    expect(outcome.content).toContain('storeName');
    expect(outcome.content).toContain('vnd');
  });

  it('should omit credential fields from the schema', async () => {
    const outcome = await describeTargetTool.run({ kind: 'store-settings' }, ctx());
    expect(outcome.content).not.toContain('apiKey');
  });

  it('should describe the writable product fields', async () => {
    const outcome = await describeTargetTool.run({ kind: 'product' }, ctx());
    expect(outcome.content).toContain('salePercent');
    expect(outcome.content).toContain('category');
  });

  it('should reject an unknown kind', async () => {
    const outcome = await describeTargetTool.run({ kind: 'invoice' }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });
});
