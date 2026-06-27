// app/api/page-builder/assistant/route.ts — admin-guarded streaming tool-use loop.
// Talks to any OpenAI-compatible chat-completions endpoint. Defaults to Google
// Gemini Flash (free AI Studio tier); point it at DeepSeek/OpenRouter/etc by
// setting ASSISTANT_LLM_BASE_URL + ASSISTANT_LLM_MODEL with no code change.
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { PageBlock } from '@/lib/page-builder';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { validateToolCall, validateUpdateFields, type Mutation } from '@/lib/page-builder/assistant/validate';
import { applyMutation } from '@/lib/page-builder/assistant/apply';

export const runtime = 'nodejs';

// Gemini's OpenAI-compatible endpoint + a cheap, tool-calling-capable default.
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_TURNS = 8;
const MAX_TOKENS = 8192;

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
  const locale = typeof body.locale === 'string' && body.locale ? body.locale : 'en';

  const apiKey = process.env.ASSISTANT_LLM_API_KEY;
  if (!apiKey) return bad(500, 'Assistant is not configured.');
  const baseURL = process.env.ASSISTANT_LLM_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.ASSISTANT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey, baseURL });

  const schemas = getBlockSchemas();
  const system = buildSystemPrompt(schemas);

  const encoder = new TextEncoder();
  type StreamEvent =
    | { type: 'mutation'; mutation: Mutation }
    | { type: 'summary'; text: string }
    | { type: 'error'; error: string }
    | { type: 'done' };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      // Server-side working copy keeps indices correct across the loop.
      let working: PageBlock[] = [...layout];

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Target locale: ${locale}. Write all user-facing copy in this locale.\nCurrent layout (index, blockType, key fields):\n${JSON.stringify(
            serializeLayout(working),
          )}\n\nRequest: ${prompt}`,
        },
      ];

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const response = await client.chat.completions.create({
            model,
            max_tokens: MAX_TOKENS,
            tools: ASSISTANT_TOOLS,
            tool_choice: 'auto',
            messages,
          });

          const choice = response.choices[0];
          if (!choice) break;
          const message = choice.message;
          messages.push(message);

          const toolCalls = message.tool_calls ?? [];
          const text = (message.content ?? '').trim();

          if (toolCalls.length === 0) {
            if (text) send({ type: 'summary', text });
            break;
          }

          for (const call of toolCalls) {
            // Only function tool-calls drive layout mutations.
            if (call.type !== 'function') {
              messages.push({ role: 'tool', tool_call_id: call.id, content: 'Unsupported tool call.' });
              continue;
            }

            let input: unknown = {};
            try {
              input = JSON.parse(call.function.arguments || '{}');
            } catch {
              input = {};
            }

            const result = validateToolCall(call.function.name, input);
            if (!result.ok) {
              send({ type: 'error', error: result.error });
              messages.push({ role: 'tool', tool_call_id: call.id, content: `ERROR: ${result.error}` });
              continue;
            }

            const mutation: Mutation = result.mutation;
            if (mutation.kind === 'update') {
              const target = working[mutation.index];
              const updateErr = !target
                ? `No block at index ${mutation.index} to update.`
                : validateUpdateFields(target.blockType, mutation.fields);
              if (updateErr) {
                send({ type: 'error', error: updateErr });
                messages.push({ role: 'tool', tool_call_id: call.id, content: `ERROR: ${updateErr}` });
                continue;
              }
            }

            working = applyMutation(working, mutation);
            send({ type: 'mutation', mutation });
            messages.push({ role: 'tool', tool_call_id: call.id, content: 'applied' });
          }
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
