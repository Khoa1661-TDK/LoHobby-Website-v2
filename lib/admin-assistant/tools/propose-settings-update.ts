import { ok, fail } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, Proposal, ToolContext } from '@/lib/admin-assistant/types';
import { isAllowedGlobal, AllowedGlobal } from '@/lib/admin-assistant/types';
import { flattenGlobalFields, getGlobalFields, isRedactedPath } from '@/lib/admin-assistant/settings-schema';

export const proposeSettingsUpdateTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_settings_update',
      description: 'Đề xuất cập nhật cài đặt',
      parameters: {
        type: 'object',
        properties: {
          global: { type: 'string', description: 'Tên global' },
          fields: { type: 'object', description: 'Các trường cần cập nhật' },
        },
        required: ['global', 'fields'],
      },
    },
  },
  run: async (args, ctx) => {
    const globalSlug = args.global as string;
    const fields = args.fields as Record<string, unknown>;

    if (!isAllowedGlobal(globalSlug)) {
      return fail(`Global '${globalSlug}' không được phép cập nhật.`);
    }

    const descriptors = flattenGlobalFields(getGlobalFields(ctx.payload, globalSlug));
    const descriptorMap = new Map(descriptors.map((d) => [d.path, d]));

    const validatedFields: Record<string, unknown> = {};
    for (const [path, value] of Object.entries(fields)) {
      const desc = descriptorMap.get(path);
      if (!desc) return fail(`Trường '${path}' không tồn tại trong global này.`);
      if (isRedactedPath(path)) return fail(`Trường '${path}' là trường bảo mật, không được phép cập nhật.`);

      let valid = false;
      if (['text', 'textarea', 'email', 'date'].includes(desc.type)) {
        if (typeof value === 'string') valid = true;
      } else if (desc.type === 'number') {
        if (typeof value === 'number') valid = true;
      } else if (desc.type === 'checkbox') {
        if (typeof value === 'boolean') valid = true;
      } else if (['select', 'radio'].includes(desc.type)) {
        if (typeof value === 'string' && desc.options?.includes(value)) valid = true;
      }

      if (!valid) return fail(`Giá trị cho '${path}' không đúng kiểu dữ liệu.`);
      validatedFields[path] = value;
    }

    const summary = `Cập nhật cài đặt ${globalSlug}`;
    // Typed so tsc enforces the shape the apply route re-validates.
    const proposal: Proposal = {
      kind: 'settingsUpdate',
      global: globalSlug as AllowedGlobal,
      fields: validatedFields,
      summary,
    };

    return ok('STAGED: ' + summary, proposal);
  },
};
