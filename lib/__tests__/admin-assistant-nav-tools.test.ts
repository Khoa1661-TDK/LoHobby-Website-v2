import { describe, expect, it, vi } from 'vitest';
import { ADMIN_PAGE_TARGETS, openAdminPageTool } from '@/lib/admin-assistant/tools/open-admin-page';
import { searchMediaTool } from '@/lib/admin-assistant/tools/search-media';
import type { ToolContext } from '@/lib/admin-assistant/types';

const ctx: ToolContext = {
  payload: { find: vi.fn().mockResolvedValue({ docs: [{ id: 9, filename: 'a.jpg', alt: 'a' }] }) } as never,
  locale: 'vi',
};

describe('searchMediaTool', () => {
  it('should return media ids for an upload field', async () => {
    const outcome = await searchMediaTool.run({ query: 'a' }, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ id: 9, filename: 'a.jpg' });
  });
});

describe('openAdminPageTool', () => {
  it('should resolve a static target to its admin url', async () => {
    const outcome = await openAdminPageTool.run({ target: 'shipping' }, ctx);
    expect(outcome.emit).toMatchObject({ kind: 'link', url: '/admin/globals/shipping-settings' });
  });

  it('should interpolate an id for a document target', async () => {
    const outcome = await openAdminPageTool.run({ target: 'order', id: 11 }, ctx);
    expect(outcome.emit).toMatchObject({ kind: 'link', url: '/admin/collections/orders/11' });
  });

  it('should error when a document target has no id', async () => {
    const outcome = await openAdminPageTool.run({ target: 'order' }, ctx);
    expect(outcome.content).toContain('ERROR:');
    expect(outcome.emit).toBeUndefined();
  });

  it('should error on an unknown target', async () => {
    const outcome = await openAdminPageTool.run({ target: 'nowhere' }, ctx);
    expect(outcome.content).toContain('ERROR:');
  });

  it('should advertise every target in its enum', () => {
    const params = openAdminPageTool.definition.function.parameters as {
      properties: { target: { enum: string[] } };
    };
    expect([...params.properties.target.enum].sort()).toEqual(Object.keys(ADMIN_PAGE_TARGETS).sort());
  });
});
