// app/api/page-builder/assistant/route.ts — admin-guarded streaming tool-use loop.
// Talks to any OpenAI-compatible chat-completions endpoint. Defaults to Google
// Gemini Flash (free AI Studio tier); point it at DeepSeek/OpenRouter/etc by
// setting ASSISTANT_LLM_BASE_URL + ASSISTANT_LLM_MODEL with no code change.
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { PageBlock } from '@/lib/page-builder';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import { ASSISTANT_TOOLS, buildSystemPrompt, type RelationshipOptions } from '@/lib/page-builder/assistant/tools';
import { validateToolCall, validateUpdateFields, coerceFieldsForBlock, type Mutation } from '@/lib/page-builder/assistant/validate';
import { applyMutation } from '@/lib/page-builder/assistant/apply';

export const runtime = 'nodejs';

// Gemini's OpenAI-compatible endpoint + a cheap, tool-calling-capable default.
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_TURNS = 8;
const MAX_TOKENS = 8192;

// Cap attached images so a single request can't blow past the model's vision budget
// or the upstream request-size limit. Data URLs are ~33% larger than the raw bytes.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image, decoded

type Body = { prompt?: unknown; layout?: unknown; locale?: unknown; images?: unknown };

// Accept only data: URLs for raster formats the vision models handle, and reject anything
// larger than the cap. Returns the subset of valid data URLs (never throws — bad entries
// are dropped so a single malformed image doesn't fail the whole request).
function sanitizeImages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const entry of input) {
    if (out.length >= MAX_IMAGES) break;
    if (typeof entry !== 'string') continue;
    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(entry);
    if (!match) continue;
    // base64 length → decoded byte count (4 chars → 3 bytes, minus padding).
    const b64 = match[2];
    if (!b64) continue;
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    const bytes = (b64.length * 3) / 4 - padding;
    if (bytes > MAX_IMAGE_BYTES) continue;
    out.push(entry);
  }
  return out;
}

type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

// Cap how many of each relationship target we list in the contract so the system
// prompt stays bounded; categories are few but products can run to the hundreds.
const RELATIONSHIP_LIMIT = 100;

// Pull the real ids the model is allowed to bind relationship fields to. Keyed by
// collection slug (`categories`, `products`) to match each block field's relationTo.
// Failures here are non-fatal — without options the contract just tells the model to
// omit relationships rather than invent ids.
async function loadRelationshipOptions(
  payload: PayloadClient,
  locale: string,
): Promise<RelationshipOptions> {
  const options: RelationshipOptions = {};
  const targets: Array<keyof RelationshipOptions> = ['categories', 'products'];

  for (const collection of targets) {
    try {
      const result = await payload.find({
        collection: collection as 'categories' | 'products',
        depth: 0,
        limit: RELATIONSHIP_LIMIT,
        pagination: false,
        locale: locale as never,
        select: { title: true },
      });
      options[collection] = result.docs.map((doc) => ({
        id: doc.id as number | string,
        label:
          (doc as { title?: unknown }).title != null
            ? String((doc as { title?: unknown }).title)
            : `#${doc.id}`,
      }));
    } catch {
      // Leave this target unset; the contract falls back to "omit if unknown".
    }
  }

  return options;
}

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
  const images = sanitizeImages(body.images);
  // A prompt OR at least one image is enough to act on — an image alone ("build this")
  // is a valid request.
  if (!prompt && images.length === 0) {
    return bad(400, 'A non-empty prompt or an image is required.');
  }
  const layout = Array.isArray(body.layout) ? (body.layout as PageBlock[]) : [];
  const locale = typeof body.locale === 'string' && body.locale ? body.locale : 'en';

  const apiKey = process.env.ASSISTANT_LLM_API_KEY;
  if (!apiKey) return bad(500, 'Assistant is not configured.');
  const baseURL = process.env.ASSISTANT_LLM_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.ASSISTANT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey, baseURL });

  const schemas = getBlockSchemas();
  // Give the model the real category ids so it binds relationship fields (e.g.
  // Featured Collection) to an existing category instead of fabricating an id —
  // a fabricated id makes Payload 400 the whole page save.
  const relationshipOptions = await loadRelationshipOptions(payload, locale);
  const system = buildSystemPrompt(schemas, relationshipOptions);

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

      const promptText = prompt || 'Build a page based on the attached image(s).';
      const userText = `Target locale: ${locale}. Write all user-facing copy in this locale.\nCurrent layout (index, blockType, key fields):\n${JSON.stringify(
        serializeLayout(working),
      )}\n\nRequest: ${promptText}`;

      // Plain string when text-only; a content-part array when images are attached, so the
      // vision-capable model sees both the instructions and the reference image(s).
      const userContent: string | ChatCompletionContentPart[] =
        images.length === 0
          ? userText
          : [
              { type: 'text', text: userText },
              ...images.map(
                (url): ChatCompletionContentPart => ({
                  type: 'image_url',
                  image_url: { url },
                }),
              ),
            ];

      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
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
              // Normalize richText Markdown → Lexical JSON now that the block type is
              // known, so the eventual page save does not 400 on a bare string.
              coerceFieldsForBlock(target!.blockType, mutation.fields);
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
