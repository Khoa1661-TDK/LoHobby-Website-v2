import { describe, expect, it, vi } from 'vitest';
import { proposeSettingsUpdateTool } from '@/lib/admin-assistant/tools/propose-settings-update';
import type { Proposal, ToolContext } from '@/lib/admin-assistant/types';

const fields = [
  { name: 'storeName', type: 'text' },
  { name: 'currency', type: 'select', options: [{ value: 'vnd' }, { value: 'usd' }] },
  { name: 'freeShippingThreshold', type: 'number' },
  { name: 'maintenance', type: 'checkbox' },
  { name: 'apiKey', type: 'text' },
];

function ctx(): ToolContext {
  return {
    payload: {
      config: { globals: [{ slug: 'store-settings', fields }] },
      updateGlobal: vi.fn(),
    } as never,
    locale: 'vi',
  };
}

describe('proposeSettingsUpdateTool', () => {
  it('should stage a valid change without writing', async () => {
    const context = ctx();
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'store-settings', fields: { storeName: 'Lô Hobby' } },
      context,
    );
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({ kind: 'settingsUpdate', global: 'store-settings' });
    expect(
      (context.payload as unknown as { updateGlobal: ReturnType<typeof vi.fn> }).updateGlobal,
    ).not.toHaveBeenCalled();
  });

  it('should reject a global outside the writable set', async () => {
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'site-header', fields: { x: 1 } },
      ctx(),
    );
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a field the global does not define', async () => {
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'store-settings', fields: { nope: 1 } },
      ctx(),
    );
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a credential field even when it exists', async () => {
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'store-settings', fields: { apiKey: 'sk-1' } },
      ctx(),
    );
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a select value outside its options', async () => {
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'store-settings', fields: { currency: 'eur' } },
      ctx(),
    );
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a value of the wrong type', async () => {
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'store-settings', fields: { freeShippingThreshold: 'free' } },
      ctx(),
    );
    expect(outcome.content).toContain('ERROR:');
  });

  it('should accept a boolean for a checkbox field', async () => {
    const outcome = await proposeSettingsUpdateTool.run(
      { global: 'store-settings', fields: { maintenance: true } },
      ctx(),
    );
    expect(outcome.emit).toBeDefined();
  });
});
