import { describe, expect, it, vi } from 'vitest';
import {
  ADMIN_TOOLS,
  ADMIN_TOOL_DEFINITIONS,
  dispatchAdminTool,
} from '@/lib/admin-assistant/registry';
import { buildAdminSystemPrompt } from '@/lib/admin-assistant/system-prompt';
import type { ToolContext } from '@/lib/admin-assistant/types';

const ctx: ToolContext = { payload: {} as never, locale: 'vi' };

const EXPECTED = [
  'find_orders',
  'get_order',
  'find_products',
  'get_product',
  'search_media',
  'read_settings',
  'describe_target',
  'open_admin_page',
  'propose_order_action',
  'propose_product_update',
  'propose_product_images',
  'propose_settings_update',
];

describe('ADMIN_TOOLS', () => {
  it('should register all twelve tools', () => {
    const names = ADMIN_TOOLS.map((tool) => tool.definition.function.name);
    expect(names.sort()).toEqual([...EXPECTED].sort());
  });

  it('should expose definitions matching the tools', () => {
    expect(ADMIN_TOOL_DEFINITIONS).toHaveLength(ADMIN_TOOLS.length);
  });

  it('should have no duplicate tool names', () => {
    const names = ADMIN_TOOLS.map((tool) => tool.definition.function.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('dispatchAdminTool', () => {
  it('should return an ERROR outcome for an unknown tool', async () => {
    const outcome = await dispatchAdminTool('teleport', {}, ctx);
    expect(outcome.content).toContain('ERROR:');
  });

  it('should route to the named tool', async () => {
    const outcome = await dispatchAdminTool('open_admin_page', { target: 'orders' }, ctx);
    expect(outcome.emit).toMatchObject({ url: '/admin/orders' });
  });

  it('should convert a thrown tool error into an ERROR outcome', async () => {
    const brokenCtx: ToolContext = {
      payload: { find: vi.fn().mockRejectedValue(new Error('db down')) } as never,
      locale: 'vi',
    };
    const outcome = await dispatchAdminTool('find_orders', {}, brokenCtx);
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('buildAdminSystemPrompt', () => {
  it('should state the propose-then-confirm rule', () => {
    expect(buildAdminSystemPrompt().toLowerCase()).toContain('confirm');
  });

  it('should tell the model to look ids up rather than invent them', () => {
    expect(buildAdminSystemPrompt().toLowerCase()).toContain('never invent');
  });
});
