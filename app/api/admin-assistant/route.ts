// app/api/admin-assistant/route.ts — admin-guarded streaming tool-use loop for the CMS.
// Write tools only stage proposals here; the apply route performs the actual writes.
import config from '@payload-config';
import { getPayload } from 'payload';
import { ADMIN_TOOL_DEFINITIONS, dispatchAdminTool } from '@/lib/admin-assistant/registry';
import { buildAdminSystemPrompt } from '@/lib/admin-assistant/system-prompt';
import type { ToolContext } from '@/lib/admin-assistant/types';
import { runAgentLoop, type LoopEvent } from '@/lib/ai/agent-loop';
import { LlmNotConfiguredError, getLlmConfig, getMaxTurns, probeLlm, type LlmConfig } from '@/lib/ai/provider';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

export const runtime = 'nodejs';

const DEFAULT_MAX_TURNS = 8;
// Generous enough that a reasoning-enabled local model still has room to answer after
// thinking. The provider disables thinking per request, but if that override ever stops
// applying, a tight budget would return empty content instead of an obvious error.
const MAX_TOKENS = 2048;

function bad(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config });
  if (!(await isAuthorizedAdmin(payload, request.headers))) return bad(401, 'Not authorized.');

  let body: { prompt?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return bad(400, 'Invalid JSON body.');
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return bad(400, 'A non-empty prompt is required.');
  const locale: 'vi' | 'en' = body.locale === 'en' ? 'en' : 'vi';

  let cfg: LlmConfig;
  try {
    cfg = getLlmConfig();
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) return bad(500, err.message);
    throw err;
  }

  const ctx: ToolContext = { payload, locale };
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: LoopEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));

      const unreachable = await probeLlm(cfg);
      if (unreachable) {
        send({ type: 'error', error: unreachable });
        send({ type: 'done' });
        controller.close();
        return;
      }

      // runAgentLoop emits its own `done` in a finally, so none is sent here.
      await runAgentLoop({
        cfg,
        system: buildAdminSystemPrompt(),
        userContent: prompt,
        tools: ADMIN_TOOL_DEFINITIONS,
        dispatch: (name, args) => dispatchAdminTool(name, args, ctx),
        maxTurns: getMaxTurns(DEFAULT_MAX_TURNS),
        maxTokens: MAX_TOKENS,
        send,
        signal: request.signal,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });
}
