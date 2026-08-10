// app/api/page-builder/assistant/route.ts — admin-guarded streaming tool-use loop.
// Talks to any OpenAI-compatible chat-completions endpoint. Defaults to Google
// Gemini Flash (free AI Studio tier); point it at DeepSeek/OpenRouter/etc by
// setting ASSISTANT_LLM_BASE_URL + ASSISTANT_LLM_MODEL with no code change.
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  ChatCompletionMessage,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { PageBlock } from '@/lib/page-builder';
import { getBlockSchemas, getBlockSchema } from '@/lib/page-builder/block-schemas';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import { serializeLayout } from '@/lib/page-builder/assistant/snapshot';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { describeBlockSpec } from '@/lib/page-builder/assistant/contract';
import { searchMedia, searchCatalog } from '@/lib/page-builder/assistant/resource-search';
import {
  validateToolCall,
  validateUpdateFields,
  validateRowFields,
  coerceFieldsForBlock,
  type Mutation,
} from '@/lib/page-builder/assistant/validate';
import { applyDualMutation, resolveLocales, type LocaleLayouts } from '@/lib/page-builder/assistant/apply-dual';
import { type Locale } from '@/i18n/routing';
import {
  LlmNotConfiguredError,
  getLlmConfig,
  getMaxTurns,
  probeLlm,
  type LlmConfig,
} from '@/lib/ai/provider';

export const runtime = 'nodejs';

// Provider defaults now live in lib/ai/provider.ts so both AI surfaces share them.
// Dual-locale copy, describe_block lookups, resource searches, and one-structural-edit-
// at-a-time mean a full page build runs long. At 16 the loop stopped mid-build, leaving a
// half-finished page. Overridable with ASSISTANT_LLM_MAX_TURNS for slow local models.
const DEFAULT_MAX_TURNS = 28;
const MAX_TOKENS = 8192;

function newBlockKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Cap attached images so a single request can't blow past the model's vision budget
// or the upstream request-size limit. Data URLs are ~33% larger than the raw bytes.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image, decoded

type Body = {
  prompt?: unknown;
  layouts?: unknown;
  activeLocale?: unknown;
  images?: unknown;
  // Legacy single-locale fields, still accepted so older callers/tests do not break.
  layout?: unknown;
  locale?: unknown;
};

const LOCALES: readonly Locale[] = ['vi', 'en'];

function asLayout(value: unknown): PageBlock[] {
  return Array.isArray(value) ? (value as PageBlock[]) : [];
}

/** Resolve the dual-locale layouts from the request body, tolerating the legacy
 *  single-locale shape ({ layout, locale }). */
function readLayouts(body: Body): { layouts: LocaleLayouts; activeLocale: Locale } {
  const activeLocale: Locale =
    body.activeLocale === 'vi' || body.activeLocale === 'en'
      ? body.activeLocale
      : body.locale === 'en'
        ? 'en'
        : 'vi';
  const raw = body.layouts && typeof body.layouts === 'object' ? (body.layouts as Record<string, unknown>) : null;
  if (raw) {
    return {
      layouts: { vi: asLayout(raw.vi), en: asLayout(raw.en) },
      activeLocale,
    };
  }
  // Legacy: a single `layout` for the active locale; the other starts as a clone so
  // structure stays in lockstep.
  const single = asLayout(body.layout);
  const other: Locale = activeLocale === 'vi' ? 'en' : 'vi';
  const layouts = { vi: [] as PageBlock[], en: [] as PageBlock[] };
  layouts[activeLocale] = single;
  layouts[other] = single.map((b) => structuredClone(b));
  return { layouts, activeLocale };
}

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
  const { layouts, activeLocale } = readLayouts(body);

  let cfg: LlmConfig;
  try {
    cfg = getLlmConfig();
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) return bad(500, err.message);
    throw err;
  }
  const { client, model } = cfg;
  const maxTurns = getMaxTurns(DEFAULT_MAX_TURNS);

  const schemas = getBlockSchemas();
  const system = buildSystemPrompt(schemas);

  const encoder = new TextEncoder();
  type StreamEvent =
    | { type: 'mutation'; mutation: Mutation; locales: Locale[] }
    | { type: 'token'; text: string }
    | { type: 'summary'; text: string }
    | { type: 'error'; error: string }
    | { type: 'done' };

  // Accumulator for a streamed tool call being assembled across chunks. The upstream
  // sends the id/name once and the JSON arguments in fragments, keyed by `index`.
  type ToolCallAcc = {
    index: number;
    id: string;
    name: string;
    args: string;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      // Server-side working copies for both locales. Structure stays in lockstep; field
      // edits are routed per-locale — same logic the client uses so indices never drift.
      const working: LocaleLayouts = {
        vi: [...layouts.vi],
        en: [...layouts.en],
      };

      // Render the current working layouts as the compact index/blockType/field snapshot the
      // model targets by index. Reused for the initial user message AND echoed back after every
      // applied mutation so the model always sees ground-truth indices (see the "Index drift"
      // open risk in docs/superpowers/specs/2026-06-26-ai-page-builder-assistant-design.md).
      const snapshotText = (state: LocaleLayouts): string =>
        LOCALES.map((loc) => `[${loc}]\n${JSON.stringify(serializeLayout(state[loc]))}`).join('\n');

      const promptText = prompt || 'Build a page based on the attached image(s).';
      const userText = `You are editing: ${activeLocale}.\nBlock structure and order are shared across locales; copy is per-locale.\nCurrent layouts (index, blockType, key fields; long strings truncated — use read_block for full values):\n${snapshotText(
        working,
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

      // Consume a completion — streaming (async-iterable of chunks) when the provider
      // supports it, or a plain completion object otherwise (unit tests, non-SSE
      // providers). In the streaming case each content delta is forwarded as a `token`
      // event so the client can render the reply as it arrives; the reassembled full
      // content is still returned and later emitted as the authoritative `summary`.
      async function collectResponse(
        result: unknown,
        onToken: (t: string) => void,
      ): Promise<{ content: string; toolCalls: ChatCompletionMessageToolCall[] }> {
        const iterable = result as { [Symbol.asyncIterator]?: unknown } | null;
        if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
          let content = '';
          const accs = new Map<number, ToolCallAcc>();
          for await (const chunk of result as AsyncIterable<{
            choices?: Array<{ delta?: { content?: string | null; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> } }>;
          }>) {
            const delta = chunk?.choices?.[0]?.delta;
            if (!delta) continue;
            if (typeof delta.content === 'string' && delta.content.length > 0) {
              content += delta.content;
              onToken(delta.content);
            }
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = typeof tc.index === 'number' ? tc.index : 0;
                let acc = accs.get(idx);
                if (!acc) {
                  acc = { index: idx, id: '', name: '', args: '' };
                  accs.set(idx, acc);
                }
                if (tc.id) acc.id = tc.id;
                if (tc.function?.name) acc.name = tc.function.name;
                if (tc.function?.arguments) acc.args += tc.function.arguments;
              }
            }
          }
          const toolCalls: ChatCompletionMessageToolCall[] = [...accs.values()]
            .sort((a, b) => a.index - b.index)
            .map((a) => ({ id: a.id, type: 'function', function: { name: a.name, arguments: a.args } }));
          return { content, toolCalls };
        }
        // Non-streaming fallback: a full completion object. No `token` events (there is no
        // real stream); the `summary` path still delivers the text.
        const msg = (result as { choices?: Array<{ message?: ChatCompletionMessage }> })?.choices?.[0]?.message;
        const content = typeof msg?.content === 'string' ? msg.content : '';
        const toolCalls = (msg?.tool_calls ?? []) as ChatCompletionMessageToolCall[];
        return { content, toolCalls };
      }

      try {
        const unreachable = await probeLlm(cfg);
        if (unreachable) {
          send({ type: 'error', error: unreachable });
          return;
        }
        for (let turn = 0; turn < maxTurns; turn++) {
          const result = await client.chat.completions.create({
            model,
            max_tokens: MAX_TOKENS,
            tools: ASSISTANT_TOOLS,
            tool_choice: 'auto',
            messages,
            stream: true,
            ...cfg.tuning,
          });

          const { content, toolCalls } = await collectResponse(result, (t) =>
            send({ type: 'token', text: t }),
          );

          // Reassemble the assistant turn so the tool loop can push tool results against it.
          const assistantMessage: ChatCompletionMessageParam = {
            role: 'assistant',
            content: content || null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          };
          messages.push(assistantMessage);

          const text = content.trim();

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

            // Read-only tools: answered as a tool message, no client mutation emitted.
            if ('query' in result) {
              const query = result.query;
              if (query.kind === 'describe') {
                const schema = getBlockSchema(query.slug);
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: schema ? describeBlockSpec(schema) : `Unknown block type "${query.slug}".`,
                });
                continue;
              }
              if (query.kind === 'searchMedia') {
                const results = await searchMedia(payload, query.query, query.limit);
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: JSON.stringify(results),
                });
                continue;
              }
              if (query.kind === 'searchCatalog') {
                const results = await searchCatalog(payload, query.collection, query.query, query.limit, activeLocale);
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: JSON.stringify(results),
                });
                continue;
              }
              const readLocale: Locale = query.locale ?? activeLocale;
              const block = working[readLocale][query.index];
              if (!block) {
                messages.push({
                  role: 'tool',
                  tool_call_id: call.id,
                  content: `ERROR: No block at index ${query.index} in ${readLocale}.`,
                });
                continue;
              }
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify({ index: query.index, locale: readLocale, block }),
              });
              continue;
            }

            const mutation: Mutation = result.mutation;
            if (mutation.kind === 'update') {
              // Structure is shared, so the block type at `index` is the same in both
              // locales — validate/coerce against the active working copy.
              const target = working[activeLocale][mutation.index];
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

            if (
              mutation.kind === 'addRow' ||
              mutation.kind === 'updateRow' ||
              mutation.kind === 'removeRow'
            ) {
              const target = working[activeLocale][mutation.index];
              let rowErr: string | null = target ? null : `No block at index ${mutation.index}.`;

              // A row index past the end would make the reducer a silent no-op: the model
              // would be told "Applied" while nothing changed, and would move on none the
              // wiser. Reject it with the real row count instead.
              if (!rowErr && (mutation.kind === 'updateRow' || mutation.kind === 'removeRow')) {
                const existing = (target as Record<string, unknown>)[mutation.field];
                const count = Array.isArray(existing) ? existing.length : 0;
                if (mutation.rowIndex < 0 || mutation.rowIndex >= count) {
                  rowErr = `No row ${mutation.rowIndex} in "${mutation.field}" (block ${mutation.index} has ${count} rows).`;
                }
              }

              if (!rowErr && (mutation.kind === 'addRow' || mutation.kind === 'updateRow')) {
                rowErr = validateRowFields(target!.blockType, mutation.field, mutation.values);
              }
              if (!rowErr && mutation.kind === 'addRow' && mutation.valuesOther) {
                rowErr = validateRowFields(target!.blockType, mutation.field, mutation.valuesOther);
              }

              if (rowErr) {
                send({ type: 'error', error: rowErr });
                messages.push({ role: 'tool', tool_call_id: call.id, content: `ERROR: ${rowErr}` });
                continue;
              }
            }

            // A newly added block gets a shared blockKey so its two locale copies stay
            // linked (same invariant the mirror hook enforces).
            if (mutation.kind === 'add') {
              const key = newBlockKey();
              mutation.block.blockKey = key;
              if (mutation.blockOther) mutation.blockOther.blockKey = key;
            }

            const locales = resolveLocales(mutation, activeLocale);
            const nextWorking = applyDualMutation(working, mutation, activeLocale);
            working.vi = nextWorking.vi;
            working.en = nextWorking.en;
            send({ type: 'mutation', mutation, locales });
            // Echo the post-mutation layout back to the model. Every add/remove/move shifts the
            // indices of the blocks after it; without this the model reasons against the stale
            // one-time snapshot and mis-targets later edits (e.g. removing "index 1" after an
            // insert deletes the hero instead). This is the design's index-drift mitigation.
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: `Applied. Indices have now shifted — the current layout is:\n${snapshotText(working)}`,
            });
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
