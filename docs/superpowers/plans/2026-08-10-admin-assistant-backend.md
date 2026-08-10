# Admin Assistant Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A streaming, admin-guarded API that answers content-management requests in natural language — find orders, read products, jump to a settings page — and stages every write as a proposal a human confirms through a separate apply endpoint.

**Architecture:** A generic tool-use loop (`lib/ai/agent-loop.ts`) drives a registry of twelve small tools. Read tools query Payload through an injected client; write tools validate their arguments and return a `Proposal` without touching the database. `POST /api/admin-assistant` streams NDJSON; `POST /api/admin-assistant/apply` re-validates a proposal and executes it through the existing domain functions.

**Tech Stack:** TypeScript (strict), Next.js 15 App Router, Payload CMS 3 Local API, `openai` client, Vitest.

Spec: `docs/superpowers/specs/2026-08-10-local-qwen-admin-assistant-design.md`
Prerequisite: `docs/superpowers/plans/2026-08-10-local-qwen-provider.md` must be complete — this plan imports `lib/ai/provider.ts`.

## Global Constraints

- Test files live in the **flat** `lib/__tests__/` directory, named `admin-assistant-*.test.ts` and `ai-*.test.ts`. `vitest.config.ts` includes `lib/__tests__/**/*.test.ts` — a test in `lib/admin-assistant/__tests__/` matches no include pattern and is **silently skipped**, so the suite goes green for code that never ran. Route tests go in `app/api/admin-assistant/__tests__/`.
- Test files **must** `import { describe, it, expect } from 'vitest'` explicitly. `globals: true` is runtime-only; `tsc --noEmit` fails without it.
- **No character-class regex (`[` … `]`) anywhere under `lib/`.** Tailwind scans `lib/`; a bracketed regex there has previously broken the whole stylesheet and 500'd every page. Use `.startsWith()` / `.includes()` / `.split()`.
- **Tool files must never import `@payload-config`**, directly or transitively. They receive the Payload client through `ctx.payload`. A lib module that top-level imports `@payload-config` and is reachable from a collection TDZ-crashes every Payload route with "Cannot access 'j' before initialization".
- **Payload relationship ids are numbers.** `defaultIDType` is numeric; writing `String(id)` is rejected. Always `Number.parseInt` and validate with `Number.isInteger`.
- **No new Payload fields or collections.** If a task appears to need one, stop and ask — this design is deliberately migration-free.
- Run `node_modules/.bin/vitest` and `node_modules/.bin/tsc` directly. Plain `pnpm <script>` fails through `runDepsStatusCheck`.
- User-facing messages are Vietnamese, matching the existing admin action results.
- Conventional Commits, lowercase imperative, no trailing period.

## File Structure

| File | Responsibility |
|---|---|
| `lib/admin-assistant/types.ts` | `AdminTool`, `ToolContext`, `ToolOutcome`, `Proposal`, `WRITABLE_GLOBALS` |
| `lib/admin-assistant/tool-kit.ts` | `ok`/`fail` outcome builders and argument coercion helpers |
| `lib/ai/parse-ndjson.ts` | Generic NDJSON line reader |
| `lib/ai/agent-loop.ts` | Provider-agnostic streaming tool-use loop |
| `lib/admin-assistant/settings-schema.ts` | Flatten a Payload global's fields into descriptors; redaction |
| `lib/admin-assistant/tools/*.ts` | One tool per file, twelve total |
| `lib/admin-assistant/registry.ts` | Assemble tools into `ADMIN_TOOLS` + `toolByName` |
| `lib/admin-assistant/system-prompt.ts` | `buildAdminSystemPrompt()` |
| `lib/admin-assistant/apply.ts` | `applyProposal` — the only write path |
| `app/api/admin-assistant/route.ts` | Streaming loop endpoint |
| `app/api/admin-assistant/apply/route.ts` | Confirm endpoint |

---

### Task 1: Types and tool kit

**Files:**
- Create: `lib/admin-assistant/types.ts`
- Create: `lib/admin-assistant/tool-kit.ts`
- Test: `lib/__tests__/admin-assistant-tool-kit.test.ts`

**Interfaces:**
- Consumes: `OrderAction`, `ShipInput` from `@/lib/order-transitions` (types only).
- Produces: every symbol below. Every later task depends on these names being exact.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-tool-kit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { asInt, asStr, fail, ok, optInt } from '@/lib/admin-assistant/tool-kit';

describe('ok', () => {
  it('should carry content and no emit by default', () => {
    expect(ok('hello')).toEqual({ content: 'hello' });
  });

  it('should carry an emit payload when given', () => {
    expect(ok('hi', { kind: 'link' })).toEqual({ content: 'hi', emit: { kind: 'link' } });
  });

  it('should serialize a non-string body as json', () => {
    expect(ok([{ id: 1 }])).toEqual({ content: '[{"id":1}]' });
  });
});

describe('fail', () => {
  it('should prefix ERROR so the model can self-correct', () => {
    expect(fail('no such order')).toEqual({ content: 'ERROR: no such order' });
  });
});

describe('asStr', () => {
  it('should read and trim a string argument', () => {
    expect(asStr({ q: '  hi  ' }, 'q')).toBe('hi');
  });

  it('should return an empty string for a missing or non-string value', () => {
    expect(asStr({}, 'q')).toBe('');
    expect(asStr({ q: 5 }, 'q')).toBe('');
  });
});

describe('asInt', () => {
  it('should read an integer', () => {
    expect(asInt({ id: 7 }, 'id')).toBe(7);
  });

  it('should parse a numeric string', () => {
    expect(asInt({ id: '7' }, 'id')).toBe(7);
  });

  it('should return null for anything else', () => {
    expect(asInt({ id: 'abc' }, 'id')).toBeNull();
    expect(asInt({ id: 1.5 }, 'id')).toBeNull();
    expect(asInt({}, 'id')).toBeNull();
  });
});

describe('optInt', () => {
  it('should clamp to the given bounds', () => {
    expect(optInt({ limit: 999 }, 'limit', 10, 25)).toBe(25);
    expect(optInt({ limit: 0 }, 'limit', 10, 25)).toBe(10);
  });

  it('should fall back to the default when absent', () => {
    expect(optInt({}, 'limit', 10, 25)).toBe(10);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-tool-kit.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin-assistant/tool-kit`.

- [ ] **Step 3: Write `lib/admin-assistant/types.ts`**

```ts
// lib/admin-assistant/types.ts — the frozen interface every admin tool implements.
// Types only, plus two const arrays. No runtime imports of Payload config.
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import type { BasePayload } from 'payload';
import type { OrderAction, ShipInput } from '@/lib/order-transitions';

/** What a tool hands back: `content` goes to the model, `emit` goes to the client. */
export type ToolOutcome = { content: string; emit?: unknown };

/** Injected by the route. Tools NEVER import @payload-config themselves. */
export type ToolContext = {
  payload: BasePayload;
  locale: 'vi' | 'en';
};

export type AdminTool = {
  definition: ChatCompletionFunctionTool;
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolOutcome>;
};

/** Globals the assistant may write. site-header and navigation are excluded on
 *  purpose: they are block/array structures, better edited at /build/header. */
export const WRITABLE_GLOBALS = [
  'store-settings',
  'shipping-settings',
  'notification-settings',
  'auto-sale-settings',
  'dropship-settings',
] as const;

export type AllowedGlobal = (typeof WRITABLE_GLOBALS)[number];

/** Product fields the assistant may change. Anything else is rejected. */
export const WRITABLE_PRODUCT_FIELDS = [
  'title',
  'price',
  'stock',
  'available',
  'onSale',
  'salePercent',
  'category',
] as const;

export type WritableProductField = (typeof WRITABLE_PRODUCT_FIELDS)[number];

/** A staged write. Produced by a tool, confirmed by a human, executed by apply.ts. */
export type Proposal =
  | {
      kind: 'orderAction';
      docId: number;
      orderCode: number;
      action: OrderAction;
      input?: ShipInput;
      summary: string;
    }
  | {
      kind: 'productUpdate';
      id: number;
      fields: Partial<Record<WritableProductField, unknown>>;
      summary: string;
    }
  | {
      kind: 'productImages';
      id: number;
      image?: number;
      gallery?: number[];
      summary: string;
    }
  | {
      kind: 'settingsUpdate';
      global: AllowedGlobal;
      fields: Record<string, unknown>;
      summary: string;
    };

export function isAllowedGlobal(value: unknown): value is AllowedGlobal {
  return typeof value === 'string' && (WRITABLE_GLOBALS as readonly string[]).includes(value);
}

export function isWritableProductField(value: unknown): value is WritableProductField {
  return (
    typeof value === 'string' && (WRITABLE_PRODUCT_FIELDS as readonly string[]).includes(value)
  );
}
```

- [ ] **Step 4: Write `lib/admin-assistant/tool-kit.ts`**

```ts
// lib/admin-assistant/tool-kit.ts — outcome builders and argument coercion.
// Every tool uses these so error text and argument handling stay uniform.
import type { ToolOutcome } from '@/lib/admin-assistant/types';

/** Success. A non-string body is JSON-encoded for the model. */
export function ok(body: unknown, emit?: unknown): ToolOutcome {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  return emit === undefined ? { content } : { content, emit };
}

/** Failure. The ERROR: prefix is the signal the loop's model uses to self-correct. */
export function fail(message: string): ToolOutcome {
  return { content: `ERROR: ${message}` };
}

export function asStr(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function asBool(args: Record<string, unknown>, key: string): boolean | null {
  const value = args[key];
  return typeof value === 'boolean' ? value : null;
}

/** Strict integer read. Accepts a numeric string because models often quote ids. */
export function asInt(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

/** Optional bounded integer, e.g. a result limit. */
export function optInt(
  args: Record<string, unknown>,
  key: string,
  fallback: number,
  max: number,
): number {
  const parsed = asInt(args, key);
  if (parsed === null || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-tool-kit.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/types.ts lib/admin-assistant/tool-kit.ts lib/__tests__/admin-assistant-tool-kit.test.ts
git commit -m "feat(admin-assistant): add tool interface types and argument kit"
```

---

### Task 2: Generic NDJSON reader

**Files:**
- Create: `lib/ai/parse-ndjson.ts`
- Modify: `lib/page-builder/assistant/parse-stream.ts`
- Test: `lib/__tests__/ai-parse-ndjson.test.ts`

**Interfaces:**
- Produces: `async function* parseNdjsonStream<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T>`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/ai-parse-ndjson.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseNdjsonStream } from '@/lib/ai/parse-ndjson';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect<T>(stream: ReadableStream<Uint8Array>): Promise<T[]> {
  const out: T[] = [];
  for await (const event of parseNdjsonStream<T>(stream)) out.push(event);
  return out;
}

describe('parseNdjsonStream', () => {
  it('should yield one object per line', async () => {
    const events = await collect(streamOf(['{"a":1}\n{"a":2}\n']));
    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('should reassemble an object split across chunks', async () => {
    const events = await collect(streamOf(['{"a":', '1}\n']));
    expect(events).toEqual([{ a: 1 }]);
  });

  it('should yield a trailing line with no newline', async () => {
    const events = await collect(streamOf(['{"a":1}']));
    expect(events).toEqual([{ a: 1 }]);
  });

  it('should skip blank lines', async () => {
    const events = await collect(streamOf(['{"a":1}\n\n{"a":2}\n']));
    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/ai-parse-ndjson.test.ts`
Expected: FAIL — cannot resolve `@/lib/ai/parse-ndjson`.

- [ ] **Step 3: Write the implementation**

Create `lib/ai/parse-ndjson.ts`:

```ts
// lib/ai/parse-ndjson.ts — read a newline-delimited JSON stream into typed events.
// Generic over the event union so every AI surface can share one reader.

export async function* parseNdjsonStream<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as T;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as T;
}
```

- [ ] **Step 4: Make the page-builder parser delegate**

Replace the body of `lib/page-builder/assistant/parse-stream.ts` below the type declaration. SEARCH:

```ts
export async function* parseAssistantStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AssistantEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as AssistantEvent;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as AssistantEvent;
}
```
REPLACE:
```ts
export function parseAssistantStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AssistantEvent> {
  return parseNdjsonStream<AssistantEvent>(body);
}
```

And add the import directly below the existing imports at the top of that file. SEARCH:
```ts
import type { Mutation } from './validate';
import type { Locale } from '@/i18n/routing';
```
REPLACE:
```ts
import type { Mutation } from './validate';
import type { Locale } from '@/i18n/routing';
import { parseNdjsonStream } from '@/lib/ai/parse-ndjson';
```

- [ ] **Step 5: Run both parser suites**

Run: `node_modules/.bin/vitest run lib/__tests__/ai-parse-ndjson.test.ts lib/__tests__/assistant-parse-stream.test.ts`
Expected: PASS. The pre-existing `assistant-parse-stream` tests prove the delegation is behaviour-preserving.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/ai/parse-ndjson.ts lib/page-builder/assistant/parse-stream.ts lib/__tests__/ai-parse-ndjson.test.ts
git commit -m "refactor(ai): extract a generic ndjson stream reader"
```

---

### Task 3: Generic agent loop

**Files:**
- Create: `lib/ai/agent-loop.ts`
- Test: `lib/__tests__/ai-agent-loop.test.ts`

**Interfaces:**
- Consumes: `LlmConfig` from `@/lib/ai/provider`.
- Produces:
  - `type LoopEvent = { type: 'token'; text: string } | { type: 'summary'; text: string } | { type: 'error'; error: string } | { type: 'tool'; name: string } | { type: 'data'; payload: unknown } | { type: 'done' }`
  - `type LoopToolOutcome = { content: string; emit?: unknown }`
  - `async function runAgentLoop(args: AgentLoopArgs): Promise<void>`

This is a **tier-A task**: the streamed tool-call accumulator is subtle (`id`/`name` arrive once, `arguments` in fragments keyed by `index`). Implement it exactly as written.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/ai-agent-loop.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { runAgentLoop, type LoopEvent } from '@/lib/ai/agent-loop';
import type { LlmConfig } from '@/lib/ai/provider';

/** Build a config whose client returns the given completions in order. */
function configReturning(responses: unknown[]): { cfg: LlmConfig; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn();
  for (const response of responses) create.mockResolvedValueOnce(response);
  const cfg = {
    client: { chat: { completions: { create } } },
    model: 'test-model',
    baseURL: 'http://127.0.0.1:8080/v1',
    tuning: { temperature: 0.2 },
    isLocal: true,
  } as unknown as LlmConfig;
  return { cfg, create };
}

function textReply(content: string): unknown {
  return { choices: [{ message: { content, tool_calls: [] } }] };
}

function toolReply(name: string, args: string, id = 'call_1'): unknown {
  return {
    choices: [
      { message: { content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: args } }] } },
    ],
  };
}

async function run(
  responses: unknown[],
  dispatch: (name: string, args: unknown) => Promise<{ content: string; emit?: unknown }>,
  maxTurns = 4,
): Promise<LoopEvent[]> {
  const events: LoopEvent[] = [];
  const { cfg } = configReturning(responses);
  await runAgentLoop({
    cfg,
    system: 'sys',
    userContent: 'hi',
    tools: [],
    dispatch,
    maxTurns,
    maxTokens: 512,
    send: (event) => events.push(event),
  });
  return events;
}

describe('runAgentLoop', () => {
  it('should emit a summary and stop when no tool is called', async () => {
    const events = await run([textReply('all done')], async () => ({ content: '' }));
    expect(events).toContainEqual({ type: 'summary', text: 'all done' });
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
  });

  it('should dispatch a tool call then continue to the next turn', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'result' });
    const events = await run([toolReply('find_orders', '{"limit":5}'), textReply('found them')], dispatch);
    expect(dispatch).toHaveBeenCalledWith('find_orders', { limit: 5 });
    expect(events).toContainEqual({ type: 'tool', name: 'find_orders' });
    expect(events).toContainEqual({ type: 'summary', text: 'found them' });
  });

  it('should forward an emit payload as a data event', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'staged', emit: { kind: 'orderAction' } });
    const events = await run([toolReply('propose_order_action', '{}'), textReply('ok')], dispatch);
    expect(events).toContainEqual({ type: 'data', payload: { kind: 'orderAction' } });
  });

  it('should report invalid tool arguments without aborting', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'never' });
    const events = await run([toolReply('find_orders', '{bad json'), textReply('recovered')], dispatch);
    expect(dispatch).toHaveBeenCalledWith('find_orders', {});
    expect(events).toContainEqual({ type: 'summary', text: 'recovered' });
  });

  it('should surface a dispatch rejection as an error event and keep going', async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error('boom'));
    const events = await run([toolReply('find_orders', '{}'), textReply('after')], dispatch);
    expect(events.some((e) => e.type === 'error' && e.error.includes('boom'))).toBe(true);
    expect(events).toContainEqual({ type: 'summary', text: 'after' });
  });

  it('should stop at maxTurns', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'again' });
    const events = await run(
      [toolReply('t', '{}'), toolReply('t', '{}'), toolReply('t', '{}')],
      dispatch,
      2,
    );
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
  });

  it('should assemble a tool call streamed in fragments', async () => {
    const chunks = [
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'get_order' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"order' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'Code":42}' } }] } }] },
    ];
    const streamed = { [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } };
    const dispatch = vi.fn().mockResolvedValue({ content: 'ok' });
    await run([streamed, textReply('done')], dispatch);
    expect(dispatch).toHaveBeenCalledWith('get_order', { orderCode: 42 });
  });

  it('should stream content deltas as token events', async () => {
    const chunks = [
      { choices: [{ delta: { content: 'Hel' } }] },
      { choices: [{ delta: { content: 'lo' } }] },
    ];
    const streamed = { [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } };
    const events = await run([streamed], async () => ({ content: '' }));
    expect(events).toContainEqual({ type: 'token', text: 'Hel' });
    expect(events).toContainEqual({ type: 'summary', text: 'Hello' });
  });

  it('should ignore reasoning_content deltas', async () => {
    const chunks = [
      { choices: [{ delta: { reasoning_content: 'thinking hard' } }] },
      { choices: [{ delta: { content: 'answer' } }] },
    ];
    const streamed = { [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } };
    const events = await run([streamed], async () => ({ content: '' }));
    expect(events).toContainEqual({ type: 'summary', text: 'answer' });
    expect(events.some((e) => e.type === 'token' && e.text.includes('thinking'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/ai-agent-loop.test.ts`
Expected: FAIL — cannot resolve `@/lib/ai/agent-loop`.

- [ ] **Step 3: Write the implementation**

Create `lib/ai/agent-loop.ts`:

```ts
// lib/ai/agent-loop.ts — provider-agnostic streaming tool-use loop.
// Modelled on the page-builder assistant route, generalised over the tool set so any
// surface can drive it by supplying a dispatch function.
import type {
  ChatCompletionContentPart,
  ChatCompletionFunctionTool,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';
import type { LlmConfig } from '@/lib/ai/provider';

export type LoopEvent =
  | { type: 'token'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'tool'; name: string }
  | { type: 'data'; payload: unknown }
  | { type: 'done' };

export type LoopToolOutcome = { content: string; emit?: unknown };

export type AgentLoopArgs = {
  cfg: LlmConfig;
  system: string;
  userContent: string | ChatCompletionContentPart[];
  tools: ChatCompletionFunctionTool[];
  /** Executes one tool. Should not throw; a rejection is reported and the loop continues. */
  dispatch: (name: string, args: Record<string, unknown>) => Promise<LoopToolOutcome>;
  maxTurns: number;
  maxTokens: number;
  send: (event: LoopEvent) => void;
  signal?: AbortSignal;
};

/** A tool call being assembled across streamed chunks. The upstream sends id/name once
 *  and the JSON arguments in fragments, keyed by `index`. */
type ToolCallAcc = { index: number; id: string; name: string; args: string };

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
};

/** Consume either a streamed completion or a plain completion object. Non-streaming is
 *  what unit tests and non-SSE providers return. */
async function collectResponse(
  result: unknown,
  onToken: (text: string) => void,
): Promise<{ content: string; toolCalls: ChatCompletionMessageToolCall[] }> {
  const iterable = result as { [Symbol.asyncIterator]?: unknown } | null;
  if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
    let content = '';
    const accs = new Map<number, ToolCallAcc>();
    for await (const chunk of result as AsyncIterable<StreamChunk>) {
      const delta = chunk?.choices?.[0]?.delta;
      if (!delta) continue;
      // `reasoning_content` is deliberately not read: Qwen emits its chain of thought
      // there, and concatenating it would put reasoning in the user-visible reply.
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
  const msg = (result as { choices?: Array<{ message?: ChatCompletionMessage }> })?.choices?.[0]
    ?.message;
  const content = typeof msg?.content === 'string' ? msg.content : '';
  const toolCalls = (msg?.tool_calls ?? []) as ChatCompletionMessageToolCall[];
  return { content, toolCalls };
}

export async function runAgentLoop(args: AgentLoopArgs): Promise<void> {
  const { cfg, system, userContent, tools, dispatch, maxTurns, maxTokens, send, signal } = args;
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break;

      const result = await cfg.client.chat.completions.create({
        model: cfg.model,
        max_tokens: maxTokens,
        tools,
        tool_choice: 'auto',
        messages,
        stream: true,
        ...cfg.tuning,
      });

      const { content, toolCalls } = await collectResponse(result, (text) =>
        send({ type: 'token', text }),
      );

      messages.push({
        role: 'assistant',
        content: content || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      if (toolCalls.length === 0) {
        const text = content.trim();
        if (text) send({ type: 'summary', text });
        return;
      }

      for (const call of toolCalls) {
        if (call.type !== 'function') {
          messages.push({ role: 'tool', tool_call_id: call.id, content: 'Unsupported tool call.' });
          continue;
        }

        // Malformed JSON is reported to the model rather than aborting the run: it
        // usually retries correctly on the next turn.
        let parsed: Record<string, unknown> = {};
        try {
          const raw = JSON.parse(call.function.arguments || '{}') as unknown;
          if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            parsed = raw as Record<string, unknown>;
          }
        } catch {
          parsed = {};
        }

        send({ type: 'tool', name: call.function.name });

        let outcome: LoopToolOutcome;
        try {
          outcome = await dispatch(call.function.name, parsed);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Tool failed.';
          send({ type: 'error', error: message });
          outcome = { content: `ERROR: ${message}` };
        }

        if (outcome.emit !== undefined) send({ type: 'data', payload: outcome.emit });
        messages.push({ role: 'tool', tool_call_id: call.id, content: outcome.content });
      }
    }
  } catch (err) {
    send({ type: 'error', error: err instanceof Error ? err.message : 'Assistant failed.' });
  } finally {
    send({ type: 'done' });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/ai-agent-loop.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/ai/agent-loop.ts lib/__tests__/ai-agent-loop.test.ts
git commit -m "feat(ai): add a provider-agnostic streaming tool-use loop"
```

---

### Task 4: Order read tools

**Files:**
- Create: `lib/admin-assistant/tools/find-orders.ts`
- Create: `lib/admin-assistant/tools/get-order.ts`
- Test: `lib/__tests__/admin-assistant-order-tools.test.ts`

**Interfaces:**
- Consumes: `AdminTool`, `ToolContext` (Task 1); `ok`, `fail`, `asInt`, `asStr`, `optInt` (Task 1); `mapOrderToFulfillmentView` from `@/lib/order-fulfillment-view`; `availableActions` from `@/lib/order-transitions`.
- Produces: `export const findOrdersTool: AdminTool`, `export const getOrderTool: AdminTool`.

`mapOrderToFulfillmentView` is client-safe (no Payload server imports), so tools may import it. Do **not** import `lib/order-fulfillment.ts` — it pulls in `@payload-config`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-order-tools.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { findOrdersTool } from '@/lib/admin-assistant/tools/find-orders';
import { getOrderTool } from '@/lib/admin-assistant/tools/get-order';
import type { ToolContext } from '@/lib/admin-assistant/types';

function orderDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 11,
    orderId: '1042',
    customerName: 'Lan Nguyen',
    totalAmount: 250000,
    paymentStatus: 'paid',
    orderStatus: 'pending',
    paymentKind: 'payos',
    deliveryMethod: 'delivery',
    createdAt: '2026-08-01T00:00:00.000Z',
    lineItems: [],
    ...overrides,
  };
}

function ctxWith(docs: Record<string, unknown>[]): ToolContext {
  return {
    payload: { find: vi.fn().mockResolvedValue({ docs }) } as never,
    locale: 'vi',
  };
}

describe('findOrdersTool', () => {
  it('should return compact rows with the actions each order allows', async () => {
    const ctx = ctxWith([orderDoc()]);
    const outcome = await findOrdersTool.run({}, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ docId: 11, orderCode: 1042, orderStatus: 'pending' });
    expect(rows[0].availableActions).toContain('confirm');
  });

  it('should filter by order status', async () => {
    const ctx = ctxWith([orderDoc(), orderDoc({ id: 12, orderId: '1043', orderStatus: 'delivered' })]);
    const outcome = await findOrdersTool.run({ status: 'delivered' }, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].orderCode).toBe(1043);
  });

  it('should filter by a free-text query on customer name and order code', async () => {
    const ctx = ctxWith([orderDoc(), orderDoc({ id: 12, orderId: '1043', customerName: 'Minh Tran' })]);
    const outcome = await findOrdersTool.run({ query: 'minh' }, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0].customerName).toBe('Minh Tran');
  });

  it('should not leak buyer contact details into the list', async () => {
    const ctx = ctxWith([orderDoc({ buyerEmail: 'a@b.com', phoneNumber: '0900000000' })]);
    const outcome = await findOrdersTool.run({}, ctx);
    expect(outcome.content).not.toContain('a@b.com');
    expect(outcome.content).not.toContain('0900000000');
  });
});

describe('getOrderTool', () => {
  it('should look an order up by its order code', async () => {
    const ctx = ctxWith([orderDoc()]);
    const outcome = await getOrderTool.run({ orderCode: 1042 }, ctx);
    const order = JSON.parse(outcome.content) as Record<string, unknown>;
    expect(order.orderCode).toBe(1042);
    expect(order.availableActions).toContain('confirm');
  });

  it('should error when neither identifier is given', async () => {
    const outcome = await getOrderTool.run({}, ctxWith([]));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should error when the order does not exist', async () => {
    const outcome = await getOrderTool.run({ orderCode: 9999 }, ctxWith([]));
    expect(outcome.content).toContain('ERROR:');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-order-tools.test.ts`
Expected: FAIL — cannot resolve the two tool modules.

- [ ] **Step 3: Write `lib/admin-assistant/tools/find-orders.ts`**

```ts
// lib/admin-assistant/tools/find-orders.ts — compact order list for triage.
import { ok, optInt, asStr } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool } from '@/lib/admin-assistant/types';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import { availableActions } from '@/lib/order-transitions';
import type { Order } from '@/src/payload/payload-types';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'canceled'];

export const findOrdersTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'find_orders',
      description:
        'List recent orders, newest first, with the actions each one currently allows. Filter by status or by a text match on customer name or order code. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string', enum: ORDER_STATUSES, description: 'Optional order status filter.' },
          query: { type: 'string', description: 'Optional text match on customer name or order code.' },
          limit: { type: 'integer', description: 'Maximum rows (default 10, max 25).' },
        },
        required: [],
      },
    },
  },
  async run(args, ctx) {
    const status = asStr(args, 'status');
    const query = asStr(args, 'query').toLowerCase();
    const limit = optInt(args, 'limit', 10, 25);

    const found = await ctx.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 100,
      pagination: false,
      depth: 0,
    });

    const rows = (found.docs as Order[])
      .map(mapOrderToFulfillmentView)
      .filter((view) => (status ? view.orderStatus === status : true))
      .filter((view) =>
        query
          ? view.customerName.toLowerCase().includes(query) ||
            String(view.orderCode).includes(query)
          : true,
      )
      .slice(0, limit)
      // Buyer email and phone are deliberately omitted here — the list is for triage.
      // get_order returns them when fulfilment actually needs them.
      .map((view) => ({
        docId: view.id,
        orderCode: view.orderCode,
        customerName: view.customerName,
        totalAmount: view.totalAmount,
        paymentStatus: view.paymentStatus,
        orderStatus: view.orderStatus,
        createdAt: view.createdAt,
        availableActions: availableActions(view),
      }));

    return ok(rows);
  },
};
```

- [ ] **Step 4: Write `lib/admin-assistant/tools/get-order.ts`**

```ts
// lib/admin-assistant/tools/get-order.ts — full detail for one order.
import { asInt, fail, ok } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool } from '@/lib/admin-assistant/types';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import { availableActions } from '@/lib/order-transitions';
import type { Order } from '@/src/payload/payload-types';

export const getOrderTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_order',
      description:
        'Read one order in full: line items, address, shipment and the actions it allows. Identify it by orderCode (the number the customer sees) or by docId. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          orderCode: { type: 'integer', description: 'The customer-facing order number.' },
          docId: { type: 'integer', description: 'The internal document id.' },
        },
        required: [],
      },
    },
  },
  async run(args, ctx) {
    const orderCode = asInt(args, 'orderCode');
    const docId = asInt(args, 'docId');
    if (orderCode === null && docId === null) {
      return fail('Cần orderCode hoặc docId để tra cứu đơn hàng.');
    }

    const found = await ctx.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 100,
      pagination: false,
      depth: 0,
    });

    const view = (found.docs as Order[])
      .map(mapOrderToFulfillmentView)
      .find((candidate) =>
        docId !== null ? String(candidate.id) === String(docId) : candidate.orderCode === orderCode,
      );

    if (!view) {
      return fail(`Không tìm thấy đơn hàng ${docId !== null ? `#${docId}` : `#${orderCode}`}.`);
    }

    return ok({ ...view, availableActions: availableActions(view) });
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-order-tools.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/find-orders.ts lib/admin-assistant/tools/get-order.ts lib/__tests__/admin-assistant-order-tools.test.ts
git commit -m "feat(admin-assistant): add order read tools"
```

---

### Task 5: Product read tools

**Files:**
- Create: `lib/admin-assistant/tools/find-products.ts`
- Create: `lib/admin-assistant/tools/get-product.ts`
- Test: `lib/__tests__/admin-assistant-product-tools.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `searchCatalog` from `@/lib/page-builder/assistant/resource-search`.
- Produces: `export const findProductsTool: AdminTool`, `export const getProductTool: AdminTool`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-product-tools.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { findProductsTool } from '@/lib/admin-assistant/tools/find-products';
import { getProductTool } from '@/lib/admin-assistant/tools/get-product';
import type { ToolContext } from '@/lib/admin-assistant/types';

const productDoc = {
  id: 5,
  title: 'Khung ảnh in 3D',
  slug: 'khung-anh-in-3d',
  price: 120000,
  stock: 4,
  available: true,
  onSale: false,
  salePercent: 0,
  category: { id: 2, title: 'Trang trí' },
  image: { id: 9, filename: 'frame.jpg' },
  gallery: [{ media: { id: 10, filename: 'frame-2.jpg' } }],
  variants: { docs: [{ id: 3, name: 'Đen', stock: 2, sku: 'F-BLK' }] },
};

function ctx(find: unknown, findByID?: unknown): ToolContext {
  return {
    payload: { find, findByID } as never,
    locale: 'vi',
  };
}

describe('findProductsTool', () => {
  it('should return commerce fields for products', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [productDoc] });
    const outcome = await findProductsTool.run({ query: 'khung' }, ctx(find));
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ id: 5, title: 'Khung ảnh in 3D', price: 120000, stock: 4 });
  });

  it('should return id and title only when searching categories', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 2, title: 'Trang trí' }] });
    const outcome = await findProductsTool.run({ query: '', collection: 'categories' }, ctx(find));
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toEqual({ id: 2, title: 'Trang trí' });
  });

  it('should reject an unknown collection', async () => {
    const outcome = await findProductsTool.run({ query: '', collection: 'orders' }, ctx(vi.fn()));
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('getProductTool', () => {
  it('should include media ids and variants', async () => {
    const findByID = vi.fn().mockResolvedValue(productDoc);
    const outcome = await getProductTool.run({ id: 5 }, ctx(vi.fn(), findByID));
    const product = JSON.parse(outcome.content) as Record<string, unknown>;
    expect(product).toMatchObject({ id: 5, image: 9, categoryId: 2 });
    expect(product.gallery).toEqual([10]);
    expect(product.variants).toEqual([{ id: 3, name: 'Đen', sku: 'F-BLK', stock: 2 }]);
  });

  it('should request depth 1 so join fields hydrate', async () => {
    const findByID = vi.fn().mockResolvedValue(productDoc);
    await getProductTool.run({ id: 5 }, ctx(vi.fn(), findByID));
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ depth: 1 }));
  });

  it('should error on a missing or non-integer id', async () => {
    const outcome = await getProductTool.run({ id: 'abc' }, ctx(vi.fn(), vi.fn()));
    expect(outcome.content).toContain('ERROR:');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-product-tools.test.ts`
Expected: FAIL — cannot resolve the two tool modules.

- [ ] **Step 3: Write `lib/admin-assistant/tools/find-products.ts`**

```ts
// lib/admin-assistant/tools/find-products.ts — catalog lookup for ids and stock levels.
import { asStr, fail, ok, optInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool } from '@/lib/admin-assistant/types';
import { searchCatalog } from '@/lib/page-builder/assistant/resource-search';

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

export const findProductsTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'find_products',
      description:
        'Find products by title, returning ids, price and stock. Set collection to "categories" to look up a category id instead. Never invent an id — always look it up here. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', description: 'Text matched against the title. Empty lists recent items.' },
          collection: { type: 'string', enum: ['products', 'categories'], description: 'Defaults to products.' },
          limit: { type: 'integer', description: 'Maximum rows (default 10, max 25).' },
        },
        required: ['query'],
      },
    },
  },
  async run(args, ctx) {
    const query = asStr(args, 'query');
    const limit = optInt(args, 'limit', 10, 25);
    const collection = asStr(args, 'collection') || 'products';

    if (collection !== 'products' && collection !== 'categories') {
      return fail('collection phải là "products" hoặc "categories".');
    }

    if (collection === 'categories') {
      return ok(await searchCatalog(ctx.payload, 'categories', query, limit, ctx.locale));
    }

    const found = await ctx.payload.find({
      collection: 'products',
      depth: 0,
      limit,
      locale: ctx.locale as never,
      sort: '-createdAt',
      ...(query ? { where: { title: { like: query } } } : {}),
    });

    const rows = found.docs.map((doc) => {
      const d = doc as unknown as Record<string, unknown>;
      return {
        id: d.id,
        title: typeof d.title === 'string' ? d.title : '',
        slug: typeof d.slug === 'string' ? d.slug : '',
        price: num(d.price),
        stock: num(d.stock),
        available: d.available === true,
        onSale: d.onSale === true,
        salePercent: num(d.salePercent),
      };
    });

    return ok(rows);
  },
};
```

- [ ] **Step 4: Write `lib/admin-assistant/tools/get-product.ts`**

```ts
// lib/admin-assistant/tools/get-product.ts — one product with its media ids and variants.
import { asInt, fail, ok } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool } from '@/lib/admin-assistant/types';

/** Payload returns either a bare id (depth 0) or a populated doc. Normalise to a number. */
function relId(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const id = (value as Record<string, unknown>).id;
    if (typeof id === 'number') return id;
  }
  return null;
}

export const getProductTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_product',
      description:
        'Read one product in full, including its main image id, gallery media ids and variants with per-variant stock. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'integer', description: 'Numeric product id.' } },
        required: ['id'],
      },
    },
  },
  async run(args, ctx) {
    const id = asInt(args, 'id');
    if (id === null) return fail('id sản phẩm phải là số nguyên.');

    // depth 1 is required: join fields (variants) return bare ids at depth 0, which makes
    // per-variant stock unreadable and out-of-stock checks fail open.
    const doc = (await ctx.payload.findByID({
      collection: 'products',
      id,
      depth: 1,
      locale: ctx.locale as never,
    })) as unknown as Record<string, unknown> | null;

    if (!doc) return fail(`Không tìm thấy sản phẩm #${id}.`);

    const galleryRows = Array.isArray(doc.gallery) ? doc.gallery : [];
    const variantDocs = (doc.variants as { docs?: unknown[] } | undefined)?.docs ?? [];

    return ok({
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      price: doc.price ?? null,
      stock: doc.stock ?? null,
      available: doc.available === true,
      onSale: doc.onSale === true,
      salePercent: doc.salePercent ?? null,
      categoryId: relId(doc.category),
      image: relId(doc.image),
      gallery: galleryRows
        .map((row) => relId((row as Record<string, unknown>).media))
        .filter((value): value is number => value !== null),
      variants: variantDocs.map((variant) => {
        const v = variant as Record<string, unknown>;
        return { id: v.id, name: v.name, sku: v.sku ?? null, stock: v.stock ?? null };
      }),
    });
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-product-tools.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/find-products.ts lib/admin-assistant/tools/get-product.ts lib/__tests__/admin-assistant-product-tools.test.ts
git commit -m "feat(admin-assistant): add product read tools"
```

---

### Task 6: Media search and admin navigation tools

**Files:**
- Create: `lib/admin-assistant/tools/search-media.ts`
- Create: `lib/admin-assistant/tools/open-admin-page.ts`
- Test: `lib/__tests__/admin-assistant-nav-tools.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `searchMedia` from `@/lib/page-builder/assistant/resource-search`.
- Produces: `export const searchMediaTool: AdminTool`, `export const openAdminPageTool: AdminTool`, `export const ADMIN_PAGE_TARGETS: Record<string, string>`.

`open_admin_page` is the "fast option access" feature. It emits a link payload the panel renders as a clickable card.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-nav-tools.test.ts`:

```ts
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
    expect(params.properties.target.enum.sort()).toEqual(Object.keys(ADMIN_PAGE_TARGETS).sort());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-nav-tools.test.ts`
Expected: FAIL — cannot resolve the two tool modules.

- [ ] **Step 3: Write `lib/admin-assistant/tools/search-media.ts`**

```ts
// lib/admin-assistant/tools/search-media.ts — media library lookup for picture changes.
import { asStr, ok, optInt } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool } from '@/lib/admin-assistant/types';
import { searchMedia } from '@/lib/page-builder/assistant/resource-search';

export const searchMediaTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_media',
      description:
        'Find images in the media library by filename or alt text, returning their numeric ids. An empty query returns the most recent uploads. Call this before proposing any picture change. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', description: 'Text matched against filename and alt text.' },
          limit: { type: 'integer', description: 'Maximum results (default 10, max 25).' },
        },
        required: ['query'],
      },
    },
  },
  async run(args, ctx) {
    return ok(await searchMedia(ctx.payload, asStr(args, 'query'), optInt(args, 'limit', 10, 25)));
  },
};
```

- [ ] **Step 4: Write `lib/admin-assistant/tools/open-admin-page.ts`**

```ts
// lib/admin-assistant/tools/open-admin-page.ts — answer "where do I change X" with a link.
// This is the fast-access path: one turn, no writes, no database round trip.
import { asInt, asStr, fail, ok } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool } from '@/lib/admin-assistant/types';

/** `{id}` marks a target that needs an id argument. */
export const ADMIN_PAGE_TARGETS: Record<string, string> = {
  'store-settings': '/admin/globals/store-settings',
  shipping: '/admin/globals/shipping-settings',
  notifications: '/admin/globals/notification-settings',
  'auto-sale': '/admin/globals/auto-sale-settings',
  header: '/admin/globals/site-header',
  navigation: '/admin/globals/navigation',
  dropship: '/admin/globals/dropship-settings',
  orders: '/admin/orders',
  order: '/admin/collections/orders/{id}',
  products: '/admin/collections/products',
  product: '/admin/collections/products/{id}',
  media: '/admin/collections/media',
  coupons: '/admin/coupons',
  'gift-cards': '/admin/gift-cards',
  campaigns: '/admin/campaigns',
  reviews: '/admin/reviews',
  'catalog-tools': '/admin/catalog-tools',
  analytics: '/admin/analytics',
  'page-builder': '/build',
};

const LABELS: Record<string, string> = {
  'store-settings': 'Cài đặt cửa hàng',
  shipping: 'Cài đặt vận chuyển',
  notifications: 'Cài đặt thông báo',
  'auto-sale': 'Cài đặt tự động giảm giá',
  header: 'Header website',
  navigation: 'Menu điều hướng',
  dropship: 'Cài đặt dropship',
  orders: 'Quản lý đơn hàng',
  order: 'Chi tiết đơn hàng',
  products: 'Danh sách sản phẩm',
  product: 'Chi tiết sản phẩm',
  media: 'Thư viện ảnh',
  coupons: 'Mã giảm giá',
  'gift-cards': 'Thẻ quà tặng',
  campaigns: 'Chiến dịch email',
  reviews: 'Đánh giá',
  'catalog-tools': 'Nhập/xuất sản phẩm',
  analytics: 'Thống kê',
  'page-builder': 'Trình dựng trang',
};

export const openAdminPageTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'open_admin_page',
      description:
        'Answer "where do I change X" by returning a link to the right admin screen. Use this instead of describing where to click. Changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', enum: Object.keys(ADMIN_PAGE_TARGETS), description: 'Which screen to open.' },
          id: { type: 'integer', description: 'Required for the "order" and "product" targets.' },
        },
        required: ['target'],
      },
    },
  },
  async run(args) {
    const target = asStr(args, 'target');
    const template = ADMIN_PAGE_TARGETS[target];
    if (!template) return fail(`Không có màn hình "${target}".`);

    if (template.includes('{id}')) {
      const id = asInt(args, 'id');
      if (id === null) return fail(`Màn hình "${target}" cần tham số id.`);
      const url = template.replace('{id}', String(id));
      const label = `${LABELS[target] ?? target} #${id}`;
      return ok(`Link: ${url}`, { kind: 'link', url, label });
    }

    const label = LABELS[target] ?? target;
    return ok(`Link: ${template}`, { kind: 'link', url: template, label });
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-nav-tools.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/search-media.ts lib/admin-assistant/tools/open-admin-page.ts lib/__tests__/admin-assistant-nav-tools.test.ts
git commit -m "feat(admin-assistant): add media search and admin navigation tools"
```

---

### Task 7: Settings schema flattener

**Files:**
- Create: `lib/admin-assistant/settings-schema.ts`
- Test: `lib/__tests__/admin-assistant-settings-schema.test.ts`

**Interfaces:**
- Produces:
  - `type FieldDescriptor = { path: string; type: string; label?: string; options?: string[] }`
  - `function flattenGlobalFields(fields: unknown[], prefix?: string): FieldDescriptor[]`
  - `function isRedactedPath(path: string): boolean`
  - `function getGlobalFields(payload: BasePayload, slug: string): unknown[]`
  - `function readByPath(source: unknown, path: string): unknown`

Reading the field list off the live Payload config (rather than a hardcoded list) is deliberate: this project has already been bitten by a hardcoded schema probe drifting silently out of sync with the real fields.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-settings-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  flattenGlobalFields,
  isRedactedPath,
  readByPath,
} from '@/lib/admin-assistant/settings-schema';

const fields = [
  { name: 'storeName', type: 'text', label: 'Store name' },
  { name: 'currency', type: 'select', options: [{ value: 'vnd', label: 'VND' }, { value: 'usd', label: 'USD' }] },
  { name: 'freeShipping', type: 'checkbox' },
  {
    name: 'contact',
    type: 'group',
    fields: [
      { name: 'email', type: 'email' },
      { name: 'zaloToken', type: 'text' },
    ],
  },
  { type: 'row', fields: [{ name: 'minOrder', type: 'number' }] },
  { name: 'blocks', type: 'blocks', blocks: [] },
  { name: 'items', type: 'array', fields: [{ name: 'x', type: 'text' }] },
];

describe('flattenGlobalFields', () => {
  it('should list scalar fields with their types', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat).toContainEqual({ path: 'storeName', type: 'text', label: 'Store name' });
    expect(flat).toContainEqual({ path: 'freeShipping', type: 'checkbox' });
  });

  it('should carry select option values', () => {
    const flat = flattenGlobalFields(fields);
    const currency = flat.find((f) => f.path === 'currency');
    expect(currency?.options).toEqual(['vnd', 'usd']);
  });

  it('should descend into groups with a dotted path', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'contact.email')).toBe(true);
  });

  it('should flatten presentational rows without adding a path segment', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'minOrder')).toBe(true);
  });

  it('should skip array and blocks fields, which are not scalar-editable', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'blocks')).toBe(false);
    expect(flat.some((f) => f.path.startsWith('items'))).toBe(false);
  });

  it('should omit redacted fields entirely', () => {
    const flat = flattenGlobalFields(fields);
    expect(flat.some((f) => f.path === 'contact.zaloToken')).toBe(false);
  });
});

describe('isRedactedPath', () => {
  it('should redact credential-shaped names case-insensitively', () => {
    expect(isRedactedPath('apiKey')).toBe(true);
    expect(isRedactedPath('webhookUrl')).toBe(true);
    expect(isRedactedPath('contact.zaloToken')).toBe(true);
    expect(isRedactedPath('adminPassword')).toBe(true);
  });

  it('should leave ordinary names alone', () => {
    expect(isRedactedPath('storeName')).toBe(false);
    expect(isRedactedPath('freeShipping')).toBe(false);
  });
});

describe('readByPath', () => {
  it('should read a nested value', () => {
    expect(readByPath({ contact: { email: 'a@b.com' } }, 'contact.email')).toBe('a@b.com');
  });

  it('should return undefined for a missing path', () => {
    expect(readByPath({}, 'contact.email')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-settings-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin-assistant/settings-schema`.

- [ ] **Step 3: Write the implementation**

Create `lib/admin-assistant/settings-schema.ts`:

```ts
// lib/admin-assistant/settings-schema.ts — describe a Payload global's writable scalar
// fields by walking the live config. Deliberately not a hardcoded list: a hardcoded schema
// probe elsewhere in this project drifted silently out of sync with the real fields.
import type { BasePayload } from 'payload';

export type FieldDescriptor = {
  path: string;
  type: string;
  label?: string;
  options?: string[];
};

/** Scalar field types the assistant is allowed to read and propose changes to. */
const SCALAR_TYPES = ['text', 'textarea', 'email', 'number', 'checkbox', 'select', 'radio', 'date'];

/** Presentational wrappers that hold fields but contribute no path segment. */
const TRANSPARENT_TYPES = ['row', 'collapsible', 'unnamedTab'];

/** Substrings that mark a credential. Lowercase comparison, no regex — a bracketed
 *  character class in lib/ breaks the Tailwind build. */
const REDACTED_PARTS = ['token', 'secret', 'key', 'password', 'webhook'];

export function isRedactedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return REDACTED_PARTS.some((part) => lower.includes(part));
}

function optionValues(field: Record<string, unknown>): string[] | undefined {
  const options = field.options;
  if (!Array.isArray(options)) return undefined;
  const values: string[] = [];
  for (const option of options) {
    if (typeof option === 'string') values.push(option);
    else if (option && typeof option === 'object') {
      const value = (option as Record<string, unknown>).value;
      if (typeof value === 'string') values.push(value);
    }
  }
  return values.length > 0 ? values : undefined;
}

/** Walk a global's field list into flat dotted descriptors. Arrays and blocks are skipped:
 *  they are row structures, not scalar options, and belong in the visual editors. */
export function flattenGlobalFields(fields: unknown[], prefix = ''): FieldDescriptor[] {
  const out: FieldDescriptor[] = [];
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue;
    const field = raw as Record<string, unknown>;
    const type = typeof field.type === 'string' ? field.type : '';
    const name = typeof field.name === 'string' ? field.name : '';

    if (TRANSPARENT_TYPES.includes(type) && Array.isArray(field.fields)) {
      out.push(...flattenGlobalFields(field.fields, prefix));
      continue;
    }

    if (type === 'group' && name && Array.isArray(field.fields)) {
      out.push(...flattenGlobalFields(field.fields, prefix ? `${prefix}.${name}` : name));
      continue;
    }

    if (!name || !SCALAR_TYPES.includes(type)) continue;

    const path = prefix ? `${prefix}.${name}` : name;
    if (isRedactedPath(path)) continue;

    const descriptor: FieldDescriptor = { path, type };
    if (typeof field.label === 'string') descriptor.label = field.label;
    const options = optionValues(field);
    if (options) descriptor.options = options;
    out.push(descriptor);
  }
  return out;
}

/** Pull one global's field list off the live config. Returns [] for an unknown slug. */
export function getGlobalFields(payload: BasePayload, slug: string): unknown[] {
  const globals = payload.config.globals as Array<{ slug: string; fields: unknown[] }>;
  const match = globals.find((global) => global.slug === slug);
  return match ? match.fields : [];
}

/** Read a dotted path out of a plain object. */
export function readByPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-settings-schema.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/settings-schema.ts lib/__tests__/admin-assistant-settings-schema.test.ts
git commit -m "feat(admin-assistant): flatten payload global fields into descriptors"
```

---

### Task 8: Settings read tools

**Files:**
- Create: `lib/admin-assistant/tools/read-settings.ts`
- Create: `lib/admin-assistant/tools/describe-target.ts`
- Test: `lib/__tests__/admin-assistant-settings-tools.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `flattenGlobalFields`, `getGlobalFields`, `readByPath` (Task 7).
- Produces: `export const readSettingsTool: AdminTool`, `export const describeTargetTool: AdminTool`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-settings-tools.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { describeTargetTool } from '@/lib/admin-assistant/tools/describe-target';
import { readSettingsTool } from '@/lib/admin-assistant/tools/read-settings';
import type { ToolContext } from '@/lib/admin-assistant/types';

const globalFields = [
  { name: 'storeName', type: 'text' },
  { name: 'currency', type: 'select', options: [{ value: 'vnd' }, { value: 'usd' }] },
  { name: 'apiKey', type: 'text' },
];

function ctx(globalValue: Record<string, unknown> = {}): ToolContext {
  return {
    payload: {
      config: { globals: [{ slug: 'store-settings', fields: globalFields }] },
      findGlobal: vi.fn().mockResolvedValue(globalValue),
    } as never,
    locale: 'vi',
  };
}

describe('readSettingsTool', () => {
  it('should return current values keyed by path', async () => {
    const outcome = await readSettingsTool.run(
      { global: 'store-settings' },
      ctx({ storeName: 'Lô Hobby', currency: 'vnd', apiKey: 'sk-secret' }),
    );
    const values = JSON.parse(outcome.content) as Record<string, unknown>;
    expect(values.storeName).toBe('Lô Hobby');
    expect(values.currency).toBe('vnd');
  });

  it('should never return a credential field', async () => {
    const outcome = await readSettingsTool.run(
      { global: 'store-settings' },
      ctx({ storeName: 'Lô Hobby', apiKey: 'sk-secret' }),
    );
    expect(outcome.content).not.toContain('sk-secret');
    expect(outcome.content).not.toContain('apiKey');
  });

  it('should reject a global outside the writable set', async () => {
    const outcome = await readSettingsTool.run({ global: 'site-header' }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('describeTargetTool', () => {
  it('should list writable global fields with their enum values', async () => {
    const outcome = await describeTargetTool.run({ kind: 'store-settings' }, ctx());
    expect(outcome.content).toContain('storeName');
    expect(outcome.content).toContain('vnd');
  });

  it('should omit credential fields from the schema', async () => {
    const outcome = await describeTargetTool.run({ kind: 'store-settings' }, ctx());
    expect(outcome.content).not.toContain('apiKey');
  });

  it('should describe the writable product fields', async () => {
    const outcome = await describeTargetTool.run({ kind: 'product' }, ctx());
    expect(outcome.content).toContain('salePercent');
    expect(outcome.content).toContain('category');
  });

  it('should reject an unknown kind', async () => {
    const outcome = await describeTargetTool.run({ kind: 'invoice' }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-settings-tools.test.ts`
Expected: FAIL — cannot resolve the two tool modules.

- [ ] **Step 3: Write `lib/admin-assistant/tools/read-settings.ts`**

```ts
// lib/admin-assistant/tools/read-settings.ts — current values of a writable global.
import {
  flattenGlobalFields,
  getGlobalFields,
  readByPath,
} from '@/lib/admin-assistant/settings-schema';
import { asStr, fail, ok } from '@/lib/admin-assistant/tool-kit';
import { WRITABLE_GLOBALS, isAllowedGlobal, type AdminTool } from '@/lib/admin-assistant/types';

export const readSettingsTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'read_settings',
      description:
        'Read the current values of a store settings group. Credential fields are never returned. Call describe_target first if you need to know which fields exist. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          global: { type: 'string', enum: [...WRITABLE_GLOBALS], description: 'Which settings group to read.' },
        },
        required: ['global'],
      },
    },
  },
  async run(args, ctx) {
    const slug = asStr(args, 'global');
    if (!isAllowedGlobal(slug)) {
      return fail(`Không đọc được nhóm cài đặt "${slug}".`);
    }

    const doc = (await ctx.payload.findGlobal({
      slug: slug as never,
      depth: 0,
      locale: ctx.locale as never,
    })) as unknown;

    const descriptors = flattenGlobalFields(getGlobalFields(ctx.payload, slug));
    const values: Record<string, unknown> = {};
    for (const descriptor of descriptors) {
      values[descriptor.path] = readByPath(doc, descriptor.path) ?? null;
    }
    return ok(values);
  },
};
```

- [ ] **Step 4: Write `lib/admin-assistant/tools/describe-target.ts`**

```ts
// lib/admin-assistant/tools/describe-target.ts — the field spec for a settings group or
// for products, so the model never invents a field name.
import { flattenGlobalFields, getGlobalFields } from '@/lib/admin-assistant/settings-schema';
import { asStr, fail, ok } from '@/lib/admin-assistant/tool-kit';
import { WRITABLE_GLOBALS, isAllowedGlobal, type AdminTool } from '@/lib/admin-assistant/types';

const PRODUCT_SPEC = [
  { path: 'title', type: 'text' },
  { path: 'price', type: 'number', note: 'VND, integer, >= 0' },
  { path: 'stock', type: 'number', note: 'integer >= 0; variant products use per-variant stock' },
  { path: 'available', type: 'checkbox', note: 'false hides the product from the storefront' },
  { path: 'onSale', type: 'checkbox' },
  { path: 'salePercent', type: 'number', note: 'integer 0-100' },
  { path: 'category', type: 'relationship', note: 'numeric category id from find_products' },
];

export const describeTargetTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'describe_target',
      description:
        'List the fields you may change on a settings group or on a product, with types and allowed values. Call this before proposing any change to a target you have not touched yet. Returns data only.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kind: { type: 'string', enum: ['product', ...WRITABLE_GLOBALS], description: 'What to describe.' },
        },
        required: ['kind'],
      },
    },
  },
  async run(args, ctx) {
    const kind = asStr(args, 'kind');
    if (kind === 'product') return ok(PRODUCT_SPEC);
    if (!isAllowedGlobal(kind)) return fail(`Không mô tả được "${kind}".`);
    return ok(flattenGlobalFields(getGlobalFields(ctx.payload, kind)));
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-settings-tools.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/read-settings.ts lib/admin-assistant/tools/describe-target.ts lib/__tests__/admin-assistant-settings-tools.test.ts
git commit -m "feat(admin-assistant): add settings read and schema tools"
```

---

### Task 9: Order action proposal tool

**Files:**
- Create: `lib/admin-assistant/tools/propose-order-action.ts`
- Test: `lib/__tests__/admin-assistant-propose-order.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `availableActions`, `isOrderAction`, `ACTION_LABELS` from `@/lib/order-transitions`; `mapOrderToFulfillmentView`.
- Produces: `export const proposeOrderActionTool: AdminTool`.

This tool **must not write anything.** It validates and returns a `Proposal` in `emit`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-propose-order.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { proposeOrderActionTool } from '@/lib/admin-assistant/tools/propose-order-action';
import type { Proposal, ToolContext } from '@/lib/admin-assistant/types';

function orderDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 11,
    orderId: '1042',
    customerName: 'Lan Nguyen',
    totalAmount: 250000,
    paymentStatus: 'paid',
    orderStatus: 'pending',
    paymentKind: 'payos',
    deliveryMethod: 'delivery',
    createdAt: '2026-08-01T00:00:00.000Z',
    lineItems: [],
    ...overrides,
  };
}

function ctx(docs: Record<string, unknown>[]): ToolContext {
  const update = vi.fn();
  return {
    payload: { find: vi.fn().mockResolvedValue({ docs }), update } as never,
    locale: 'vi',
  };
}

describe('proposeOrderActionTool', () => {
  it('should stage a confirm as a proposal without writing', async () => {
    const context = ctx([orderDoc()]);
    const outcome = await proposeOrderActionTool.run({ docId: 11, action: 'confirm' }, context);
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({ kind: 'orderAction', docId: 11, orderCode: 1042, action: 'confirm' });
    expect(proposal.summary).toContain('1042');
    expect((context.payload as unknown as { update: unknown }).update).not.toHaveBeenCalled();
  });

  it('should reject an action the order does not currently allow', async () => {
    const outcome = await proposeOrderActionTool.run(
      { docId: 11, action: 'refund' },
      ctx([orderDoc({ orderStatus: 'pending' })]),
    );
    expect(outcome.content).toContain('ERROR:');
    expect(outcome.emit).toBeUndefined();
  });

  it('should reject an unknown action', async () => {
    const outcome = await proposeOrderActionTool.run({ docId: 11, action: 'teleport' }, ctx([orderDoc()]));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should require carrier and tracking for ship', async () => {
    const shippable = orderDoc({ orderStatus: 'processing', confirmedAt: '2026-08-02T00:00:00.000Z' });
    const outcome = await proposeOrderActionTool.run({ docId: 11, action: 'ship' }, ctx([shippable]));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should stage a ship proposal carrying the shipment input', async () => {
    const shippable = orderDoc({ orderStatus: 'processing', confirmedAt: '2026-08-02T00:00:00.000Z' });
    const outcome = await proposeOrderActionTool.run(
      { docId: 11, action: 'ship', carrierKey: 'ghn', trackingNumber: 'GHN123' },
      ctx([shippable]),
    );
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({
      kind: 'orderAction',
      action: 'ship',
      input: { carrierKey: 'ghn', trackingNumber: 'GHN123' },
    });
  });

  it('should error when the order does not exist', async () => {
    const outcome = await proposeOrderActionTool.run({ docId: 99, action: 'confirm' }, ctx([]));
    expect(outcome.content).toContain('ERROR:');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-order.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin-assistant/tools/propose-order-action`.

- [ ] **Step 3: Write the implementation**

Create `lib/admin-assistant/tools/propose-order-action.ts`:

```ts
// lib/admin-assistant/tools/propose-order-action.ts — stage one order operation.
// Validates only. The write happens in apply.ts after a human confirms, so a
// misread order can never confirm, cancel or refund on its own.
import { asInt, asStr, fail, ok } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, Proposal } from '@/lib/admin-assistant/types';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import { ACTION_LABELS, availableActions, isOrderAction } from '@/lib/order-transitions';
import type { Order } from '@/src/payload/payload-types';

export const proposeOrderActionTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_order_action',
      description:
        'Stage one order operation for the human to confirm. Nothing changes until they click Confirm. The action must be one of the order\'s availableActions from find_orders or get_order. "ship" also needs carrierKey and trackingNumber.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          docId: { type: 'integer', description: 'Internal document id of the order.' },
          action: {
            type: 'string',
            enum: ['mark_paid', 'confirm', 'ship', 'sync_tracking', 'mark_delivered', 'cancel', 'refund'],
          },
          carrierKey: { type: 'string', description: 'Shipping carrier key. Required for "ship".' },
          trackingNumber: { type: 'string', description: 'Tracking number. Required for "ship".' },
          customTrackingUrl: { type: 'string', description: 'Optional override tracking URL.' },
        },
        required: ['docId', 'action'],
      },
    },
  },
  async run(args, ctx) {
    const docId = asInt(args, 'docId');
    if (docId === null) return fail('docId phải là số nguyên.');

    const action = asStr(args, 'action');
    if (!isOrderAction(action)) return fail(`Thao tác "${action}" không hợp lệ.`);

    const found = await ctx.payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 100,
      pagination: false,
      depth: 0,
    });
    const view = (found.docs as Order[])
      .map(mapOrderToFulfillmentView)
      .find((candidate) => String(candidate.id) === String(docId));

    if (!view) return fail(`Không tìm thấy đơn hàng #${docId}.`);

    const allowed = availableActions(view);
    if (!allowed.includes(action)) {
      return fail(
        `Đơn #${view.orderCode} không cho phép "${action}" ở trạng thái hiện tại. Cho phép: ${allowed.join(', ') || 'không có'}.`,
      );
    }

    const proposal: Proposal = {
      kind: 'orderAction',
      docId: Number(view.id),
      orderCode: view.orderCode,
      action,
      summary: `${ACTION_LABELS[action]} — đơn #${view.orderCode} (${view.customerName})`,
    };

    if (action === 'ship') {
      const carrierKey = asStr(args, 'carrierKey');
      const trackingNumber = asStr(args, 'trackingNumber');
      if (!carrierKey || !trackingNumber) {
        return fail('Thao tác "ship" cần carrierKey và trackingNumber.');
      }
      const customTrackingUrl = asStr(args, 'customTrackingUrl');
      proposal.input = {
        carrierKey,
        trackingNumber,
        ...(customTrackingUrl ? { customTrackingUrl } : {}),
      };
    }

    return ok(`STAGED: ${proposal.summary}. Chờ người dùng xác nhận.`, proposal);
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-order.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/propose-order-action.ts lib/__tests__/admin-assistant-propose-order.test.ts
git commit -m "feat(admin-assistant): stage order actions as confirmable proposals"
```

---

### Task 10: Product write proposal tools

**Files:**
- Create: `lib/admin-assistant/tools/propose-product-update.ts`
- Create: `lib/admin-assistant/tools/propose-product-images.ts`
- Test: `lib/__tests__/admin-assistant-propose-product.test.ts`

**Interfaces:**
- Consumes: Task 1 exports (`isWritableProductField`, `WRITABLE_PRODUCT_FIELDS`, `Proposal`).
- Produces: `export const proposeProductUpdateTool: AdminTool`, `export const proposeProductImagesTool: AdminTool`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-propose-product.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { proposeProductImagesTool } from '@/lib/admin-assistant/tools/propose-product-images';
import { proposeProductUpdateTool } from '@/lib/admin-assistant/tools/propose-product-update';
import type { Proposal, ToolContext } from '@/lib/admin-assistant/types';

function ctx(product: unknown = { id: 5, title: 'Khung ảnh' }, media: unknown[] = [{ id: 9 }]): ToolContext {
  return {
    payload: {
      findByID: vi.fn().mockImplementation(async ({ collection }: { collection: string }) =>
        collection === 'products' ? product : null,
      ),
      find: vi.fn().mockResolvedValue({ docs: media }),
      update: vi.fn(),
    } as never,
    locale: 'vi',
  };
}

describe('proposeProductUpdateTool', () => {
  it('should stage whitelisted fields without writing', async () => {
    const context = ctx();
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { price: 99000 } }, context);
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({ kind: 'productUpdate', id: 5, fields: { price: 99000 } });
    expect((context.payload as unknown as { update: unknown }).update).not.toHaveBeenCalled();
  });

  it('should reject a field outside the whitelist', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { slug: 'hack' } }, ctx());
    expect(outcome.content).toContain('ERROR:');
    expect(outcome.emit).toBeUndefined();
  });

  it('should reject a negative price', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { price: -1 } }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a salePercent outside 0-100', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { salePercent: 150 } }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a non-numeric category id', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { category: 'trang-tri' } }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject an empty field set', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: {} }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });

  it('should error when the product does not exist', async () => {
    const outcome = await proposeProductUpdateTool.run({ id: 5, fields: { price: 1 } }, ctx(null));
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('proposeProductImagesTool', () => {
  it('should stage a main image change', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5, image: 9 }, ctx());
    expect(outcome.emit).toMatchObject({ kind: 'productImages', id: 5, image: 9 });
  });

  it('should stage a gallery change', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5, gallery: [9] }, ctx());
    expect(outcome.emit).toMatchObject({ kind: 'productImages', gallery: [9] });
  });

  it('should reject a media id that does not exist', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5, image: 404 }, ctx(undefined, []));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should reject a call that changes neither image nor gallery', async () => {
    const outcome = await proposeProductImagesTool.run({ id: 5 }, ctx());
    expect(outcome.content).toContain('ERROR:');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-product.test.ts`
Expected: FAIL — cannot resolve the two tool modules.

- [ ] **Step 3: Write `lib/admin-assistant/tools/propose-product-update.ts`**

```ts
// lib/admin-assistant/tools/propose-product-update.ts — stage scalar product edits.
import { asInt, fail, ok } from '@/lib/admin-assistant/tool-kit';
import {
  WRITABLE_PRODUCT_FIELDS,
  isWritableProductField,
  type AdminTool,
  type Proposal,
  type WritableProductField,
} from '@/lib/admin-assistant/types';

/** Per-field validation. Returns an error string, or null when the value is acceptable. */
function validateField(field: WritableProductField, value: unknown): string | null {
  switch (field) {
    case 'title':
      return typeof value === 'string' && value.trim().length > 0
        ? null
        : 'title phải là chuỗi không rỗng.';
    case 'price':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? null
        : 'price phải là số >= 0.';
    case 'stock':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0
        ? null
        : 'stock phải là số nguyên >= 0.';
    case 'available':
    case 'onSale':
      return typeof value === 'boolean' ? null : `${field} phải là true hoặc false.`;
    case 'salePercent':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
        ? null
        : 'salePercent phải là số nguyên từ 0 đến 100.';
    case 'category':
      // Payload relationship ids are numeric (defaultIDType=number); a string id is rejected
      // at write time, so catch it here where the model can still fix it.
      return typeof value === 'number' && Number.isInteger(value)
        ? null
        : 'category phải là id số — tra bằng find_products({ collection: "categories" }).';
    default:
      return `Không hỗ trợ trường "${field}".`;
  }
}

export const proposeProductUpdateTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_product_update',
      description: `Stage a change to a product's commerce fields for the human to confirm. Nothing changes until they click Confirm. Allowed fields: ${WRITABLE_PRODUCT_FIELDS.join(', ')}.`,
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'integer', description: 'Numeric product id from find_products.' },
          fields: {
            type: 'object',
            description: 'Field values to set. Only the allowed fields are accepted.',
          },
        },
        required: ['id', 'fields'],
      },
    },
  },
  async run(args, ctx) {
    const id = asInt(args, 'id');
    if (id === null) return fail('id sản phẩm phải là số nguyên.');

    const raw = args.fields;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return fail('fields phải là một object.');
    }

    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length === 0) return fail('Cần ít nhất một trường để thay đổi.');

    const fields: Partial<Record<WritableProductField, unknown>> = {};
    for (const [key, value] of entries) {
      if (!isWritableProductField(key)) {
        return fail(`Không được sửa trường "${key}". Cho phép: ${WRITABLE_PRODUCT_FIELDS.join(', ')}.`);
      }
      const error = validateField(key, value);
      if (error) return fail(error);
      fields[key] = value;
    }

    const product = (await ctx.payload.findByID({
      collection: 'products',
      id,
      depth: 0,
      locale: ctx.locale as never,
    })) as unknown as Record<string, unknown> | null;
    if (!product) return fail(`Không tìm thấy sản phẩm #${id}.`);

    const title = typeof product.title === 'string' ? product.title : `#${id}`;
    const changes = Object.entries(fields)
      .map(([key, value]) => `${key} → ${String(value)}`)
      .join(', ');

    const proposal: Proposal = {
      kind: 'productUpdate',
      id,
      fields,
      summary: `Cập nhật "${title}": ${changes}`,
    };

    return ok(`STAGED: ${proposal.summary}. Chờ người dùng xác nhận.`, proposal);
  },
};
```

- [ ] **Step 4: Write `lib/admin-assistant/tools/propose-product-images.ts`**

```ts
// lib/admin-assistant/tools/propose-product-images.ts — stage a picture change.
// Every media id is verified to exist before staging, so a hallucinated id fails here
// rather than producing a broken image on the storefront.
import { asInt, fail, ok } from '@/lib/admin-assistant/tool-kit';
import type { AdminTool, Proposal } from '@/lib/admin-assistant/types';

function intList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  for (const entry of value) {
    const parsed = typeof entry === 'number' ? entry : Number(entry);
    if (!Number.isInteger(parsed)) return null;
    out.push(parsed);
  }
  return out;
}

/** Which of the given media ids are missing from the library. */
async function missingMedia(
  payload: { find: (args: unknown) => Promise<{ docs: unknown[] }> },
  ids: number[],
): Promise<number[]> {
  if (ids.length === 0) return [];
  const found = await payload.find({
    collection: 'media',
    depth: 0,
    limit: ids.length,
    pagination: false,
    where: { id: { in: ids } },
  });
  const present = new Set(
    found.docs.map((doc) => Number((doc as Record<string, unknown>).id)),
  );
  return ids.filter((id) => !present.has(id));
}

export const proposeProductImagesTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_product_images',
      description:
        "Stage a change to a product's pictures for the human to confirm. Pass image for the main photo and/or gallery for the extra photos, both as numeric media ids from search_media. Nothing changes until they click Confirm.",
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'integer', description: 'Numeric product id.' },
          image: { type: 'integer', description: 'Media id for the main photo.' },
          gallery: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Media ids for the gallery, in display order. Replaces the whole gallery.',
          },
        },
        required: ['id'],
      },
    },
  },
  async run(args, ctx) {
    const id = asInt(args, 'id');
    if (id === null) return fail('id sản phẩm phải là số nguyên.');

    const hasImage = args.image !== undefined;
    const hasGallery = args.gallery !== undefined;
    if (!hasImage && !hasGallery) return fail('Cần image hoặc gallery để thay đổi ảnh.');

    const image = hasImage ? asInt(args, 'image') : null;
    if (hasImage && image === null) return fail('image phải là id số của ảnh.');

    const gallery = hasGallery ? intList(args.gallery) : null;
    if (hasGallery && gallery === null) return fail('gallery phải là mảng id số.');

    const product = (await ctx.payload.findByID({
      collection: 'products',
      id,
      depth: 0,
      locale: ctx.locale as never,
    })) as unknown as Record<string, unknown> | null;
    if (!product) return fail(`Không tìm thấy sản phẩm #${id}.`);

    const mediaIds = [...(image !== null ? [image] : []), ...(gallery ?? [])];
    const missing = await missingMedia(
      ctx.payload as unknown as { find: (args: unknown) => Promise<{ docs: unknown[] }> },
      mediaIds,
    );
    if (missing.length > 0) {
      return fail(`Không tìm thấy ảnh: ${missing.join(', ')}. Dùng search_media để lấy id đúng.`);
    }

    const title = typeof product.title === 'string' ? product.title : `#${id}`;
    const parts: string[] = [];
    if (image !== null) parts.push(`ảnh chính → #${image}`);
    if (gallery) parts.push(`thư viện → ${gallery.length} ảnh`);

    const proposal: Proposal = {
      kind: 'productImages',
      id,
      ...(image !== null ? { image } : {}),
      ...(gallery ? { gallery } : {}),
      summary: `Đổi ảnh "${title}": ${parts.join(', ')}`,
    };

    return ok(`STAGED: ${proposal.summary}. Chờ người dùng xác nhận.`, proposal);
  },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-product.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/propose-product-update.ts lib/admin-assistant/tools/propose-product-images.ts lib/__tests__/admin-assistant-propose-product.test.ts
git commit -m "feat(admin-assistant): stage product field and picture changes"
```

---

### Task 11: Settings write proposal tool

**Files:**
- Create: `lib/admin-assistant/tools/propose-settings-update.ts`
- Test: `lib/__tests__/admin-assistant-propose-settings.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `flattenGlobalFields`, `getGlobalFields`, `isRedactedPath` (Task 7).
- Produces: `export const proposeSettingsUpdateTool: AdminTool`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-propose-settings.test.ts`:

```ts
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
    expect((context.payload as unknown as { updateGlobal: unknown }).updateGlobal).not.toHaveBeenCalled();
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-settings.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin-assistant/tools/propose-settings-update`.

- [ ] **Step 3: Write the implementation**

Create `lib/admin-assistant/tools/propose-settings-update.ts`:

```ts
// lib/admin-assistant/tools/propose-settings-update.ts — stage a store settings change.
// Field paths and value types are checked against the live Payload config, so this stays
// correct when a global gains or loses a field.
import {
  flattenGlobalFields,
  getGlobalFields,
  isRedactedPath,
  type FieldDescriptor,
} from '@/lib/admin-assistant/settings-schema';
import { asStr, fail, ok } from '@/lib/admin-assistant/tool-kit';
import {
  WRITABLE_GLOBALS,
  isAllowedGlobal,
  type AdminTool,
  type Proposal,
} from '@/lib/admin-assistant/types';

function typeError(descriptor: FieldDescriptor, value: unknown): string | null {
  switch (descriptor.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'date':
      return typeof value === 'string' ? null : `${descriptor.path} phải là chuỗi.`;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : `${descriptor.path} phải là số.`;
    case 'checkbox':
      return typeof value === 'boolean' ? null : `${descriptor.path} phải là true hoặc false.`;
    case 'select':
    case 'radio': {
      if (typeof value !== 'string') return `${descriptor.path} phải là chuỗi.`;
      const options = descriptor.options ?? [];
      return options.includes(value)
        ? null
        : `${descriptor.path} phải là một trong: ${options.join(', ')}.`;
    }
    default:
      return `Không hỗ trợ sửa trường kiểu "${descriptor.type}".`;
  }
}

export const proposeSettingsUpdateTool: AdminTool = {
  definition: {
    type: 'function',
    function: {
      name: 'propose_settings_update',
      description:
        'Stage a change to a store settings group for the human to confirm. Nothing changes until they click Confirm. Call describe_target first to learn the exact field paths and allowed values.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          global: { type: 'string', enum: [...WRITABLE_GLOBALS] },
          fields: {
            type: 'object',
            description: 'Dotted field paths mapped to their new values, e.g. { "contact.email": "a@b.com" }.',
          },
        },
        required: ['global', 'fields'],
      },
    },
  },
  async run(args, ctx) {
    const slug = asStr(args, 'global');
    if (!isAllowedGlobal(slug)) {
      return fail(
        `Không sửa được nhóm "${slug}". Cho phép: ${WRITABLE_GLOBALS.join(', ')}. Header và menu dùng trình dựng trang tại /build/header.`,
      );
    }

    const raw = args.fields;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('fields phải là một object.');
    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length === 0) return fail('Cần ít nhất một trường để thay đổi.');

    const descriptors = flattenGlobalFields(getGlobalFields(ctx.payload, slug));
    const byPath = new Map(descriptors.map((descriptor) => [descriptor.path, descriptor]));

    const fields: Record<string, unknown> = {};
    for (const [path, value] of entries) {
      if (isRedactedPath(path)) return fail(`Không được sửa trường bảo mật "${path}".`);
      const descriptor = byPath.get(path);
      if (!descriptor) {
        return fail(`Nhóm "${slug}" không có trường "${path}". Dùng describe_target để xem danh sách.`);
      }
      const error = typeError(descriptor, value);
      if (error) return fail(error);
      fields[path] = value;
    }

    const changes = Object.entries(fields)
      .map(([path, value]) => `${path} → ${String(value)}`)
      .join(', ');

    const proposal: Proposal = {
      kind: 'settingsUpdate',
      global: slug,
      fields,
      summary: `Cập nhật ${slug}: ${changes}`,
    };

    return ok(`STAGED: ${proposal.summary}. Chờ người dùng xác nhận.`, proposal);
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-propose-settings.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/tools/propose-settings-update.ts lib/__tests__/admin-assistant-propose-settings.test.ts
git commit -m "feat(admin-assistant): stage store settings changes"
```

---

### Task 12: Registry and system prompt

**Files:**
- Create: `lib/admin-assistant/registry.ts`
- Create: `lib/admin-assistant/system-prompt.ts`
- Test: `lib/__tests__/admin-assistant-registry.test.ts`

**Interfaces:**
- Consumes: every tool from Tasks 4-11.
- Produces:
  - `export const ADMIN_TOOLS: AdminTool[]`
  - `export const ADMIN_TOOL_DEFINITIONS: ChatCompletionFunctionTool[]`
  - `export function dispatchAdminTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome>`
  - `export function buildAdminSystemPrompt(): string`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-registry.test.ts`:

```ts
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
    const prompt = buildAdminSystemPrompt();
    expect(prompt.toLowerCase()).toContain('confirm');
  });

  it('should tell the model to look ids up rather than invent them', () => {
    expect(buildAdminSystemPrompt().toLowerCase()).toContain('never invent');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-registry.test.ts`
Expected: FAIL — cannot resolve the registry module.

- [ ] **Step 3: Write `lib/admin-assistant/registry.ts`**

```ts
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
```

- [ ] **Step 4: Write `lib/admin-assistant/system-prompt.ts`**

```ts
// lib/admin-assistant/system-prompt.ts — kept short on purpose. The model runs locally at
// roughly 40 tok/s, so every prompt token is latency; the tool descriptions carry the detail.

export function buildAdminSystemPrompt(): string {
  return [
    'You are the admin assistant for a Vietnamese e-commerce store, working inside the CMS.',
    'You help with four things: finding the right admin screen, handling orders, changing product details and pictures, and changing store settings.',
    '',
    'HOW YOU WORK:',
    'You cannot change anything directly. The propose_* tools STAGE a change and the human clicks Confirm to apply it. Say clearly what you staged and that it is waiting for confirmation.',
    'Read before you write: use find_orders / get_order / find_products / get_product / read_settings to check the real current state, then propose.',
    'Never invent an id, a field name, or an order code. Look ids up with find_products, search_media or find_orders, and field names with describe_target.',
    'When the user asks where to change something, call open_admin_page and let the link answer it — do not describe where to click.',
    'Only propose an order action listed in that order\'s availableActions.',
    '',
    'STYLE:',
    'Reply in Vietnamese. Be brief — one or two sentences. No preamble, no restating the question.',
    'Call one tool at a time and read its result before the next call.',
    'If a tool returns ERROR, fix the arguments and try once more; if it fails again, explain the problem instead of guessing.',
  ].join('\n');
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-registry.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/registry.ts lib/admin-assistant/system-prompt.ts lib/__tests__/admin-assistant-registry.test.ts
git commit -m "feat(admin-assistant): assemble the tool registry and system prompt"
```

---

### Task 13: Proposal apply logic

**Files:**
- Create: `lib/admin-assistant/apply.ts`
- Test: `lib/__tests__/admin-assistant-apply.test.ts`

**Interfaces:**
- Consumes: `Proposal`, `isAllowedGlobal`, `isWritableProductField` (Task 1); `isOrderAction` from `@/lib/order-transitions`.
- Produces:
  - `type ApplyResult = { ok: true; message: string } | { ok: false; message: string }`
  - `function parseProposal(value: unknown): Proposal | null` — re-validation of untrusted input
  - `async function applyProposal(proposal: Proposal, deps: ApplyDeps): Promise<ApplyResult>`
  - `type ApplyDeps = { payload: BasePayload; locale: 'vi' | 'en'; runOrderAction: (docId: number, action: string, input?: ShipInput) => Promise<{ ok: boolean; message: string }> }`

`runOrderAction` is injected rather than imported so this module stays testable and free of `@payload-config`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/admin-assistant-apply.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { applyProposal, parseProposal } from '@/lib/admin-assistant/apply';
import type { Proposal } from '@/lib/admin-assistant/types';

function deps() {
  return {
    payload: { update: vi.fn().mockResolvedValue({}), updateGlobal: vi.fn().mockResolvedValue({}) } as never,
    locale: 'vi' as const,
    runOrderAction: vi.fn().mockResolvedValue({ ok: true, message: 'Đã xác nhận đơn #1042.' }),
  };
}

describe('parseProposal', () => {
  it('should accept a well-formed order proposal', () => {
    const proposal = {
      kind: 'orderAction',
      docId: 11,
      orderCode: 1042,
      action: 'confirm',
      summary: 'x',
    };
    expect(parseProposal(proposal)).toMatchObject({ kind: 'orderAction', action: 'confirm' });
  });

  it('should reject an unknown proposal kind', () => {
    expect(parseProposal({ kind: 'dropDatabase' })).toBeNull();
  });

  it('should reject a tampered product field', () => {
    expect(
      parseProposal({ kind: 'productUpdate', id: 5, fields: { slug: 'x' }, summary: 'x' }),
    ).toBeNull();
  });

  it('should reject a tampered global slug', () => {
    expect(
      parseProposal({ kind: 'settingsUpdate', global: 'users', fields: { a: 1 }, summary: 'x' }),
    ).toBeNull();
  });

  it('should reject a non-object', () => {
    expect(parseProposal('confirm everything')).toBeNull();
  });
});

describe('applyProposal', () => {
  it('should route an order action through runOrderAction', async () => {
    const d = deps();
    const proposal: Proposal = {
      kind: 'orderAction',
      docId: 11,
      orderCode: 1042,
      action: 'confirm',
      summary: 'x',
    };
    const result = await applyProposal(proposal, d);
    expect(d.runOrderAction).toHaveBeenCalledWith(11, 'confirm', undefined);
    expect(result.ok).toBe(true);
  });

  it('should update product fields through payload', async () => {
    const d = deps();
    await applyProposal(
      { kind: 'productUpdate', id: 5, fields: { price: 99000 }, summary: 'x' },
      d,
    );
    expect((d.payload as unknown as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'products', id: 5, data: { price: 99000 } }),
    );
  });

  it('should write gallery rows in payload array shape', async () => {
    const d = deps();
    await applyProposal({ kind: 'productImages', id: 5, gallery: [9, 10], summary: 'x' }, d);
    expect((d.payload as unknown as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { gallery: [{ media: 9 }, { media: 10 }] } }),
    );
  });

  it('should expand a dotted settings path into a nested object', async () => {
    const d = deps();
    await applyProposal(
      { kind: 'settingsUpdate', global: 'store-settings', fields: { 'contact.email': 'a@b.com' }, summary: 'x' },
      d,
    );
    expect(
      (d.payload as unknown as { updateGlobal: ReturnType<typeof vi.fn> }).updateGlobal,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'store-settings', data: { contact: { email: 'a@b.com' } } }),
    );
  });

  it('should report a failed order action', async () => {
    const d = deps();
    d.runOrderAction = vi.fn().mockResolvedValue({ ok: false, message: 'Không hợp lệ.' });
    const result = await applyProposal(
      { kind: 'orderAction', docId: 11, orderCode: 1042, action: 'cancel', summary: 'x' },
      d,
    );
    expect(result).toEqual({ ok: false, message: 'Không hợp lệ.' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-apply.test.ts`
Expected: FAIL — cannot resolve `@/lib/admin-assistant/apply`.

- [ ] **Step 3: Write the implementation**

Create `lib/admin-assistant/apply.ts`:

```ts
// lib/admin-assistant/apply.ts — the only write path in the admin assistant.
// The proposal arriving here came back from the browser, so it is untrusted input and is
// re-validated from scratch before anything is executed.
import type { BasePayload } from 'payload';
import {
  isAllowedGlobal,
  isWritableProductField,
  type Proposal,
  type WritableProductField,
} from '@/lib/admin-assistant/types';
import { isOrderAction, type ShipInput } from '@/lib/order-transitions';

export type ApplyResult = { ok: true; message: string } | { ok: false; message: string };

export type ApplyDeps = {
  payload: BasePayload;
  locale: 'vi' | 'en';
  /** Injected so this module never imports @payload-config. */
  runOrderAction: (
    docId: number,
    action: string,
    input?: ShipInput,
  ) => Promise<{ ok: boolean; message: string }>;
};

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function readShipInput(value: unknown): ShipInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  if (typeof input.carrierKey !== 'string' || typeof input.trackingNumber !== 'string') {
    return undefined;
  }
  return {
    carrierKey: input.carrierKey,
    trackingNumber: input.trackingNumber,
    ...(typeof input.customTrackingUrl === 'string'
      ? { customTrackingUrl: input.customTrackingUrl }
      : {}),
  };
}

/** Re-validate an untrusted proposal. Returns null when anything is off. */
export function parseProposal(value: unknown): Proposal | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const summary = typeof raw.summary === 'string' ? raw.summary : '';

  if (raw.kind === 'orderAction') {
    if (!isInt(raw.docId) || !isInt(raw.orderCode) || !isOrderAction(raw.action)) return null;
    const input = readShipInput(raw.input);
    if (raw.action === 'ship' && !input) return null;
    return {
      kind: 'orderAction',
      docId: raw.docId,
      orderCode: raw.orderCode,
      action: raw.action,
      ...(input ? { input } : {}),
      summary,
    };
  }

  if (raw.kind === 'productUpdate') {
    if (!isInt(raw.id) || !raw.fields || typeof raw.fields !== 'object') return null;
    const fields: Partial<Record<WritableProductField, unknown>> = {};
    for (const [key, fieldValue] of Object.entries(raw.fields as Record<string, unknown>)) {
      if (!isWritableProductField(key)) return null;
      fields[key] = fieldValue;
    }
    if (Object.keys(fields).length === 0) return null;
    return { kind: 'productUpdate', id: raw.id, fields, summary };
  }

  if (raw.kind === 'productImages') {
    if (!isInt(raw.id)) return null;
    const image = raw.image === undefined ? undefined : isInt(raw.image) ? raw.image : null;
    if (image === null) return null;
    let gallery: number[] | undefined;
    if (raw.gallery !== undefined) {
      if (!Array.isArray(raw.gallery) || !raw.gallery.every(isInt)) return null;
      gallery = raw.gallery as number[];
    }
    if (image === undefined && gallery === undefined) return null;
    return {
      kind: 'productImages',
      id: raw.id,
      ...(image !== undefined ? { image } : {}),
      ...(gallery !== undefined ? { gallery } : {}),
      summary,
    };
  }

  if (raw.kind === 'settingsUpdate') {
    if (!isAllowedGlobal(raw.global)) return null;
    if (!raw.fields || typeof raw.fields !== 'object' || Array.isArray(raw.fields)) return null;
    const fields = raw.fields as Record<string, unknown>;
    if (Object.keys(fields).length === 0) return null;
    return { kind: 'settingsUpdate', global: raw.global, fields, summary };
  }

  return null;
}

/** Expand dotted paths ("contact.email") into the nested object Payload expects. */
function expandPaths(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(fields)) {
    const segments = path.split('.');
    let cursor = out;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i] as string;
      const existing = cursor[segment];
      if (!existing || typeof existing !== 'object') cursor[segment] = {};
      cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1] as string] = value;
  }
  return out;
}

export async function applyProposal(proposal: Proposal, deps: ApplyDeps): Promise<ApplyResult> {
  const { payload, locale } = deps;

  if (proposal.kind === 'orderAction') {
    const result = await deps.runOrderAction(proposal.docId, proposal.action, proposal.input);
    return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
  }

  if (proposal.kind === 'productUpdate') {
    await payload.update({
      collection: 'products',
      id: proposal.id,
      locale: locale as never,
      data: proposal.fields as never,
    });
    return { ok: true, message: proposal.summary || `Đã cập nhật sản phẩm #${proposal.id}.` };
  }

  if (proposal.kind === 'productImages') {
    const data: Record<string, unknown> = {};
    if (proposal.image !== undefined) data.image = proposal.image;
    // Gallery rows are { media } objects; the storedGallery snapshot is refilled by the
    // collection's own afterChange hook on save.
    if (proposal.gallery !== undefined) data.gallery = proposal.gallery.map((id) => ({ media: id }));
    await payload.update({
      collection: 'products',
      id: proposal.id,
      locale: locale as never,
      data: data as never,
    });
    return { ok: true, message: proposal.summary || `Đã đổi ảnh sản phẩm #${proposal.id}.` };
  }

  await payload.updateGlobal({
    slug: proposal.global as never,
    locale: locale as never,
    data: expandPaths(proposal.fields) as never,
  });
  return { ok: true, message: proposal.summary || `Đã cập nhật ${proposal.global}.` };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/admin-assistant-apply.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Typecheck and commit**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.

```bash
git add lib/admin-assistant/apply.ts lib/__tests__/admin-assistant-apply.test.ts
git commit -m "feat(admin-assistant): re-validate and execute confirmed proposals"
```

---

### Task 14: Rate limit preset and middleware branch

**Files:**
- Modify: `lib/rate-limit.ts`
- Modify: `middleware.ts`

**Interfaces:**
- Produces: `RATE_LIMIT_PRESETS.adminAssistant`.

This is a **transcription task** — apply both edits verbatim.

- [ ] **Step 1: Add the preset**

In `lib/rate-limit.ts`. SEARCH:
```ts
  // AI assistant makes a paid Anthropic LLM call per request — keep this tight.
  assistant: { limit: 10, windowMs: 60_000 },
```
REPLACE:
```ts
  // AI assistant makes a paid Anthropic LLM call per request — keep this tight.
  assistant: { limit: 10, windowMs: 60_000 },
  // Admin assistant turns are short and often local; a looser bucket so triage
  // (several quick lookups in a row) doesn't trip the limiter.
  adminAssistant: { limit: 20, windowMs: 60_000 },
```

- [ ] **Step 2: Add the middleware branch**

In `middleware.ts`. SEARCH:
```ts
    if (pathname.startsWith('/api/page-builder/assistant')) {
      const limited = rateLimitResponse(req, 'assistant', RATE_LIMIT_PRESETS.assistant);
      if (limited) return limited;
    }
```
REPLACE:
```ts
    if (pathname.startsWith('/api/page-builder/assistant')) {
      const limited = rateLimitResponse(req, 'assistant', RATE_LIMIT_PRESETS.assistant);
      if (limited) return limited;
    }

    if (pathname.startsWith('/api/admin-assistant')) {
      const limited = rateLimitResponse(req, 'adminAssistant', RATE_LIMIT_PRESETS.adminAssistant);
      if (limited) return limited;
    }
```

- [ ] **Step 3: Verify**

Run: `node_modules/.bin/tsc --noEmit` — expected: no output.
Run: `node_modules/.bin/vitest run lib/__tests__/rate-limit.test.ts` — expected: PASS (skip if that file does not exist).

- [ ] **Step 4: Commit**

```bash
git add lib/rate-limit.ts middleware.ts
git commit -m "feat(admin-assistant): rate limit the admin assistant endpoints"
```

---

### Task 15: API routes

**Files:**
- Create: `app/api/admin-assistant/route.ts`
- Create: `app/api/admin-assistant/apply/route.ts`
- Test: `app/api/admin-assistant/__tests__/apply-route.test.ts`

**Interfaces:**
- Consumes: `runAgentLoop` (Task 3), `getLlmConfig`/`getMaxTurns`/`probeLlm` (provider plan), `ADMIN_TOOL_DEFINITIONS`/`dispatchAdminTool` (Task 12), `buildAdminSystemPrompt` (Task 12), `applyProposal`/`parseProposal` (Task 13), `isAuthorizedAdmin` from `@/lib/page-builder/admin-guard`, `runOrderAction` from `@/app/(payload)/admin/orders/actions`.
- Produces: the two HTTP endpoints.

Both routes are the only modules here allowed to import `@payload-config`.

- [ ] **Step 1: Write the failing test**

Create `app/api/admin-assistant/__tests__/apply-route.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { parseProposal } from '@/lib/admin-assistant/apply';

// The route itself pulls in @payload-config, which cannot boot under vitest. Its guard and
// validation logic are covered here through the pure functions it delegates to; the
// end-to-end path is covered by the manual verification steps in the plan.

describe('apply route contract', () => {
  it('should reject a proposal body that is not an object', () => {
    expect(parseProposal(null)).toBeNull();
  });

  it('should reject a proposal whose kind was swapped after staging', () => {
    expect(parseProposal({ kind: 'settingsUpdate', global: 'users', fields: { a: 1 } })).toBeNull();
  });

  it('should accept the exact shape the tools emit', () => {
    const staged = {
      kind: 'productImages',
      id: 5,
      gallery: [9, 10],
      summary: 'Đổi ảnh',
    };
    expect(parseProposal(staged)).toMatchObject({ kind: 'productImages', gallery: [9, 10] });
  });
});
```

- [ ] **Step 2: Run the test to verify it passes against Task 13**

Run: `node_modules/.bin/vitest run app/api/admin-assistant/__tests__/apply-route.test.ts`
Expected: PASS, 3 tests. (This test guards the contract the routes rely on; the routes themselves are verified manually in the final section.)

- [ ] **Step 3: Write `app/api/admin-assistant/route.ts`**

```ts
// app/api/admin-assistant/route.ts — admin-guarded streaming tool-use loop for the CMS.
// Write tools only stage proposals here; the apply route performs the actual writes.
import config from '@payload-config';
import { getPayload } from 'payload';
import { runAgentLoop, type LoopEvent } from '@/lib/ai/agent-loop';
import { LlmNotConfiguredError, getLlmConfig, getMaxTurns, probeLlm } from '@/lib/ai/provider';
import { ADMIN_TOOL_DEFINITIONS, dispatchAdminTool } from '@/lib/admin-assistant/registry';
import { buildAdminSystemPrompt } from '@/lib/admin-assistant/system-prompt';
import type { ToolContext } from '@/lib/admin-assistant/types';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

export const runtime = 'nodejs';

const DEFAULT_MAX_TURNS = 8;
const MAX_TOKENS = 1536;

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

  let cfg;
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
```

`runAgentLoop` already emits its own `done` in a `finally`, so the route must not send a second one.

- [ ] **Step 4: Write `app/api/admin-assistant/apply/route.ts`**

```ts
// app/api/admin-assistant/apply/route.ts — execute a proposal the human confirmed.
// The body came back from the browser, so it is re-validated here before any write.
import config from '@payload-config';
import { revalidatePath } from 'next/cache';
import { getPayload } from 'payload';
import { runOrderAction } from '@/app/(payload)/admin/orders/actions';
import { applyProposal, parseProposal } from '@/lib/admin-assistant/apply';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

export const runtime = 'nodejs';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const payload = await getPayload({ config });
  if (!(await isAuthorizedAdmin(payload, request.headers))) {
    return json(401, { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' });
  }

  let body: { proposal?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(400, { ok: false, message: 'Dữ liệu không hợp lệ.' });
  }

  const proposal = parseProposal(body.proposal);
  if (!proposal) return json(400, { ok: false, message: 'Đề xuất không hợp lệ.' });

  const locale: 'vi' | 'en' = body.locale === 'en' ? 'en' : 'vi';

  try {
    const result = await applyProposal(proposal, {
      payload,
      locale,
      runOrderAction: (docId, action, input) => runOrderAction(docId, action, input),
    });

    // runOrderAction revalidates the order paths itself; product and settings writes
    // need their own invalidation or the storefront keeps serving the cached version.
    if (result.ok && proposal.kind !== 'orderAction') {
      revalidatePath('/');
      if (proposal.kind === 'settingsUpdate') {
        revalidatePath(`/admin/globals/${proposal.global}`);
      } else {
        revalidatePath('/admin/collections/products');
        revalidatePath(`/admin/collections/products/${proposal.id}`);
      }
    }

    return json(result.ok ? 200 : 400, result);
  } catch (err) {
    return json(500, {
      ok: false,
      message: err instanceof Error ? err.message : 'Không thực hiện được thao tác.',
    });
  }
}
```

- [ ] **Step 5: Run the full suite and typecheck**

Run: `node_modules/.bin/vitest run`
Expected: PASS — every pre-existing test still green, including the page-builder assistant suite.

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin-assistant
git commit -m "feat(admin-assistant): add streaming and apply api routes"
```

---

## Manual verification

The UI arrives in the follow-up plan, so verify the API with `curl`. You need a `payload-token` cookie from a logged-in admin session (copy it out of the browser devtools).

1. Start llama.cpp (`~/llama.cpp/run-qwen.sh`) and the dev server.

2. Ask a navigation question — expect a `data` event with a link and no proposal:

```bash
curl -N -X POST http://localhost:3000/api/admin-assistant \
  -H 'Content-Type: application/json' \
  -H "Cookie: payload-token=$TOKEN" \
  -d '{"prompt":"tôi đổi phí ship ở đâu?"}'
```

3. Ask for an order action — expect a `data` event whose payload has `kind: "orderAction"`, and confirm **no** order changed in the admin.

```bash
curl -N -X POST http://localhost:3000/api/admin-assistant \
  -H 'Content-Type: application/json' \
  -H "Cookie: payload-token=$TOKEN" \
  -d '{"prompt":"xác nhận đơn hàng mới nhất"}'
```

4. Apply that proposal by posting it back verbatim, then check the order's status in `/admin/orders`:

```bash
curl -X POST http://localhost:3000/api/admin-assistant/apply \
  -H 'Content-Type: application/json' \
  -H "Cookie: payload-token=$TOKEN" \
  -d '{"proposal":{"kind":"orderAction","docId":11,"orderCode":1042,"action":"confirm","summary":"x"}}'
```

5. Tamper with a proposal (change `kind` to `settingsUpdate` with `global: "users"`) and confirm the apply route answers 400 "Đề xuất không hợp lệ."

6. Stop llama.cpp and repeat step 2 — expect the named "Local model is not running" error event.
