// lib/admin-assistant/registry.ts — the one place tools are assembled and dispatched.
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import { fail } from '@/lib/admin-assistant/tool-kit';
import { describeTargetTool } from '@/lib/admin-assistant/tools/describe-target';
import { findOrdersTool } from '@/lib/admin-assistant/tools/find-orders';
import { findProductsTool } from '@/lib/admin-assistant/tools/find-products';
import { getOrderTool } from '@/lib/admin-assistant/tools/get-order';
import { getProductTool } from '@/lib/admin-assistant/tools/get-product';
import { openAdminPageTool } from '@/lib/admin-assistant/tools/open-admin-page';
import { proposeOrderActionTool } from '@/lib/admin-assistant/tools/propose-order-action';
import { proposeProductImagesTool } from '@/lib/admin-assistant/tools/propose-product-images';
import { proposeProductUpdateTool } from '@/lib/admin-assistant/tools/propose-product-update';
import { proposeSettingsUpdateTool } from '@/lib/admin-assistant/tools/propose-settings-update';
import { readSettingsTool } from '@/lib/admin-assistant/tools/read-settings';
import { searchMediaTool } from '@/lib/admin-assistant/tools/search-media';
import type { AdminTool, ToolContext, ToolOutcome } from '@/lib/admin-assistant/types';

export const ADMIN_TOOLS: AdminTool[] = [
  findOrdersTool,
  getOrderTool,
  findProductsTool,
  getProductTool,
  searchMediaTool,
  readSettingsTool,
  describeTargetTool,
  openAdminPageTool,
  proposeOrderActionTool,
  proposeProductUpdateTool,
  proposeProductImagesTool,
  proposeSettingsUpdateTool,
];

export const ADMIN_TOOL_DEFINITIONS: ChatCompletionFunctionTool[] = ADMIN_TOOLS.map(
  (tool) => tool.definition,
);

const BY_NAME = new Map(ADMIN_TOOLS.map((tool) => [tool.definition.function.name, tool]));

/** Never throws — the agent loop needs an outcome it can hand back to the model. */
export async function dispatchAdminTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return fail(`Không có công cụ "${name}".`);
  try {
    return await tool.run(args, ctx);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Công cụ gặp lỗi.');
  }
}
