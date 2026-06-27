// app/api/page-builder/assistant/route.ts — admin-guarded streaming tool-use loop.
import Anthropic from '@anthropic-ai/sdk';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { PageBlock } from '@/lib/page-builder';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { validateToolCall, type Mutation } from '@/lib/page-builder/assistant/validate';
import { applyMutation } from '@/lib/page-builder/assistant/apply';

export const runtime = 'nodejs';
const MODEL: Anthropic.Model = 'claude-opus-4-8';
const MAX_TURNS = 8;

type Body = { prompt?: unknown; layout?: unknown; locale?: unknown };

function bad(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config });
  const authed = await isAuthorizedAdmin(payload, request.headers);
  if (!authed) return bad(401, 'Not authorized.');

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad(400, 'Invalid JSON body.');
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return bad(400, 'A non-empty prompt is required.');
  const layout = Array.isArray(body.layout) ? (body.layout as PageBlock[]) : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return bad(500, 'Assistant is not configured.');
  const client = new Anthropic({ apiKey });

  const schemas = getBlockSchemas();
  const system = buildSystemPrompt(schemas);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      // Server-side working copy keeps indices correct across the loop.
      let working: PageBlock[] = [...layout];

      const messages: Anthropic.MessageParam[] = [
        {
          role: 'user',
          content: `Current layout (index, blockType, key fields):\n${JSON.stringify(
            serializeLayout(working),
          )}\n\nRequest: ${prompt}`,
        },
      ];

      const systemBlocks: Anthropic.TextBlockParam[] = [
        { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
      ];

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 16000,
            thinking: { type: 'adaptive' },
            system: systemBlocks,
            tools: ASSISTANT_TOOLS,
            messages,
          });

          messages.push({ role: 'assistant', content: response.content });

          const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
          );
          const text = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join(' ')
            .trim();

          if (toolUses.length === 0) {
            if (text) send({ type: 'summary', text });
            break;
          }

          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const call of toolUses) {
            const result = validateToolCall(call.name, call.input);
            if (!result.ok) {
              send({ type: 'error', error: result.error });
              results.push({
                type: 'tool_result',
                tool_use_id: call.id,
                is_error: true,
                content: result.error,
              });
              continue;
            }
            const mutation: Mutation = result.mutation;
            working = applyMutation(working, mutation);
            send({ type: 'mutation', mutation });
            results.push({
              type: 'tool_result',
              tool_use_id: call.id,
              content: 'applied',
            });
          }
          messages.push({ role: 'user', content: results });
        }
      } catch (err) {
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Assistant failed.',
        });
      } finally {
        send({ type: 'done' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });
}
