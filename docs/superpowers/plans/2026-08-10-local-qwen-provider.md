# Local Qwen Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the page-builder AI assistant onto the local Qwen model running on llama.cpp, with the model-specific corrections it needs to work at all, and a named error when the local server is down.

**Architecture:** A single new module `lib/ai/provider.ts` owns everything model-specific: building the OpenAI client from env, the per-request tuning parameters Qwen needs, and a reachability probe. The existing page-builder route is edited in four small places to use it. No behaviour changes for cloud providers — the same tuning values are sane there too, so one `.env` edit switches back.

**Tech Stack:** TypeScript (strict), Next.js 15 App Router, `openai` npm client, Vitest.

Spec: `docs/superpowers/specs/2026-08-10-local-qwen-admin-assistant-design.md` §3.

## Global Constraints

- Test files live in the **flat** `lib/__tests__/` directory. `vitest.config.ts` includes `lib/__tests__/**/*.test.ts` — a test in `lib/ai/__tests__/` is silently skipped and the suite goes green for code that never ran.
- Test files **must** `import { describe, it, expect } from 'vitest'` explicitly. `globals: true` is runtime-only; `tsc --noEmit` fails without the import.
- **No character-class regex (`[` … `]`) anywhere under `lib/`.** Tailwind scans `lib/`, and a bracketed regex there has previously broken the entire stylesheet, 500-ing every page. Use `.startsWith()` / `.includes()` / `.split()`.
- `lib/ai/provider.ts` must **not** import `@payload-config`, directly or transitively.
- Run scripts as `node_modules/.bin/vitest` and `node_modules/.bin/tsc`. Plain `pnpm <script>` fails in this repo through `runDepsStatusCheck`.
- Environment variables are read **inside** functions, never at module top level, so tests can set `process.env` per case.
- Commit messages use Conventional Commits, lowercase imperative description, no trailing period.

## File Structure

| File | Responsibility |
|---|---|
| `lib/ai/provider.ts` (new) | Build `LlmConfig` from env; Qwen tuning params; local-URL detection; reachability probe |
| `lib/__tests__/ai-provider.test.ts` (new) | Unit tests for all four exports |
| `app/api/page-builder/assistant/route.ts` (modify) | Use the provider instead of inline client construction |
| `.env.example` (modify) | Document the local-Qwen env block |
| `CLAUDE.md` (modify) | One-line context note |

---

### Task 1: Provider module

**Files:**
- Create: `lib/ai/provider.ts`
- Test: `lib/__tests__/ai-provider.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type LlmConfig = { client: OpenAI; model: string; baseURL: string; tuning: Record<string, unknown>; isLocal: boolean }`
  - `class LlmNotConfiguredError extends Error`
  - `function isLocalBaseUrl(baseURL: string): boolean`
  - `function buildTuning(thinkingEnabled: boolean): Record<string, unknown>`
  - `function getLlmConfig(): LlmConfig` — throws `LlmNotConfiguredError` when `ASSISTANT_LLM_API_KEY` is unset/empty
  - `function getMaxTurns(fallback: number): number`
  - `async function probeLlm(cfg: LlmConfig): Promise<string | null>` — `null` means reachable

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/ai-provider.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LlmNotConfiguredError,
  buildTuning,
  getLlmConfig,
  getMaxTurns,
  isLocalBaseUrl,
  probeLlm,
} from '@/lib/ai/provider';

const ENV_KEYS = [
  'ASSISTANT_LLM_API_KEY',
  'ASSISTANT_LLM_BASE_URL',
  'ASSISTANT_LLM_MODEL',
  'ASSISTANT_LLM_MAX_TURNS',
  'ASSISTANT_LLM_THINKING',
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

describe('isLocalBaseUrl', () => {
  it('should treat loopback as local', () => {
    expect(isLocalBaseUrl('http://127.0.0.1:8080/v1')).toBe(true);
    expect(isLocalBaseUrl('http://localhost:8080/v1')).toBe(true);
  });

  it('should treat private ranges as local', () => {
    expect(isLocalBaseUrl('http://192.168.1.50:8080/v1')).toBe(true);
    expect(isLocalBaseUrl('http://10.10.10.41:8080/v1')).toBe(true);
    expect(isLocalBaseUrl('http://172.17.0.1:8080/v1')).toBe(true);
  });

  it('should treat public hosts as remote', () => {
    expect(isLocalBaseUrl('https://openrouter.ai/api/v1')).toBe(false);
    expect(isLocalBaseUrl('http://172.1.0.1:8080/v1')).toBe(false);
  });

  it('should treat an unparseable url as remote', () => {
    expect(isLocalBaseUrl('not a url')).toBe(false);
  });
});

describe('buildTuning', () => {
  it('should disable thinking when thinking is off', () => {
    const tuning = buildTuning(false);
    expect(tuning.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it('should omit chat_template_kwargs when thinking is on', () => {
    const tuning = buildTuning(true);
    expect(tuning.chat_template_kwargs).toBeUndefined();
  });

  it('should pin sampling params for reliable tool calls', () => {
    const tuning = buildTuning(false);
    expect(tuning.temperature).toBe(0.2);
    expect(tuning.top_p).toBe(0.8);
    expect(tuning.top_k).toBe(20);
    expect(tuning.parallel_tool_calls).toBe(false);
  });
});

describe('getLlmConfig', () => {
  it('should throw LlmNotConfiguredError when the api key is missing', () => {
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    expect(() => getLlmConfig()).toThrow(LlmNotConfiguredError);
  });

  it('should read base url and model from the environment', () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    process.env.ASSISTANT_LLM_MODEL = 'qwen3.6-35b-a3b';
    const cfg = getLlmConfig();
    expect(cfg.model).toBe('qwen3.6-35b-a3b');
    expect(cfg.baseURL).toBe('http://127.0.0.1:8080/v1');
    expect(cfg.isLocal).toBe(true);
  });

  it('should default to thinking off', () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    const cfg = getLlmConfig();
    expect(cfg.tuning.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it('should keep thinking on when explicitly enabled', () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_THINKING = 'on';
    const cfg = getLlmConfig();
    expect(cfg.tuning.chat_template_kwargs).toBeUndefined();
  });
});

describe('getMaxTurns', () => {
  it('should return the fallback when unset', () => {
    expect(getMaxTurns(28)).toBe(28);
  });

  it('should read a valid override', () => {
    process.env.ASSISTANT_LLM_MAX_TURNS = '8';
    expect(getMaxTurns(28)).toBe(8);
  });

  it('should ignore a non-numeric or non-positive override', () => {
    process.env.ASSISTANT_LLM_MAX_TURNS = 'lots';
    expect(getMaxTurns(28)).toBe(28);
    process.env.ASSISTANT_LLM_MAX_TURNS = '0';
    expect(getMaxTurns(28)).toBe(28);
  });
});

describe('probeLlm', () => {
  it('should return null for a remote provider without any fetch', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'k';
    process.env.ASSISTANT_LLM_BASE_URL = 'https://openrouter.ai/api/v1';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await probeLlm(getLlmConfig())).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should return null when the local server answers', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    expect(await probeLlm(getLlmConfig())).toBeNull();
  });

  it('should return a named error when the local server refuses', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const reason = await probeLlm(getLlmConfig());
    expect(reason).toContain('run-qwen.sh');
    expect(reason).toContain('http://127.0.0.1:8080/v1');
  });

  it('should return a named error on a non-ok response', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await probeLlm(getLlmConfig())).toContain('503');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/ai-provider.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/ai/provider"`.

- [ ] **Step 3: Write the implementation**

Create `lib/ai/provider.ts`:

```ts
// lib/ai/provider.ts — the one place that knows anything model-specific.
// Both AI surfaces build their OpenAI client here so a model swap is an .env edit.
import OpenAI from 'openai';

export type LlmConfig = {
  client: OpenAI;
  model: string;
  baseURL: string;
  /** Extra params spread into every chat.completions.create call. */
  tuning: Record<string, unknown>;
  isLocal: boolean;
};

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('Assistant is not configured.');
    this.name = 'LlmNotConfiguredError';
  }
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-2.5-flash';

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0', '::1'];

/** True for loopback and RFC1918 private ranges. Deliberately string-based:
 *  a character-class regex in lib/ breaks the Tailwind build. */
export function isLocalBaseUrl(baseURL: string): boolean {
  let host: string;
  try {
    host = new URL(baseURL).hostname;
  } catch {
    return false;
  }
  if (LOOPBACK_HOSTS.includes(host)) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('172.')) {
    const second = Number.parseInt(host.split('.')[1] ?? '', 10);
    return Number.isInteger(second) && second >= 16 && second <= 31;
  }
  return false;
}

/** Qwen3.6 corrections, safe for cloud models too.
 *  - enable_thinking:false — Qwen reasons by default and bills it to max_tokens, so
 *    `content` comes back empty with finish_reason "length". A top-level `reasoning`
 *    field is silently ignored; only chat_template_kwargs works.
 *  - sampling — llama.cpp's server default is temp 1.0 / top_p 0.95, too loose for
 *    tool-call JSON.
 *  - parallel_tool_calls:false — the loop echoes state back between calls, so parallel
 *    calls would reason against stale state. Ignored harmlessly where unsupported. */
export function buildTuning(thinkingEnabled: boolean): Record<string, unknown> {
  const tuning: Record<string, unknown> = {
    temperature: 0.2,
    top_p: 0.8,
    top_k: 20,
    parallel_tool_calls: false,
  };
  if (!thinkingEnabled) {
    tuning.chat_template_kwargs = { enable_thinking: false };
  }
  return tuning;
}

/** Build the client from env. Env is read per call so tests can vary it. */
export function getLlmConfig(): LlmConfig {
  const apiKey = process.env.ASSISTANT_LLM_API_KEY?.trim();
  if (!apiKey) throw new LlmNotConfiguredError();
  const baseURL = process.env.ASSISTANT_LLM_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.ASSISTANT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const thinkingEnabled = process.env.ASSISTANT_LLM_THINKING?.trim() === 'on';
  return {
    client: new OpenAI({ apiKey, baseURL }),
    model,
    baseURL,
    tuning: buildTuning(thinkingEnabled),
    isLocal: isLocalBaseUrl(baseURL),
  };
}

/** Turn cap, overridable per deployment without touching code. */
export function getMaxTurns(fallback: number): number {
  const raw = process.env.ASSISTANT_LLM_MAX_TURNS?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reachability check for the local server only. Returns null when reachable,
 *  otherwise a message fit to show the user instead of a raw ECONNREFUSED. */
export async function probeLlm(cfg: LlmConfig): Promise<string | null> {
  if (!cfg.isLocal) return null;
  const url = `${cfg.baseURL.replace(/\/+$/, '')}/models`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return null;
    return `Local model server answered ${res.status} at ${cfg.baseURL}. Restart it with ~/llama.cpp/run-qwen.sh`;
  } catch {
    return `Local model is not running at ${cfg.baseURL}. Start it with ~/llama.cpp/run-qwen.sh`;
  }
}
```

Note on the one regex above: `/\/+$/` contains no character class, so it is safe under the Tailwind constraint.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/ai-provider.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Typecheck**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/provider.ts lib/__tests__/ai-provider.test.ts
git commit -m "feat(ai): add shared llm provider with local qwen tuning"
```

---

### Task 2: Point the page-builder route at the provider

**Files:**
- Modify: `app/api/page-builder/assistant/route.ts`

**Interfaces:**
- Consumes: `getLlmConfig`, `getMaxTurns`, `probeLlm`, `LlmNotConfiguredError` from Task 1.
- Produces: nothing new. Existing route behaviour is preserved.

This is a **transcription task**. Apply the five edits below verbatim — do not paraphrase, and do not restructure surrounding code. The existing 501 assistant tests must stay green.

- [ ] **Step 1: Edit 1 — imports**

SEARCH:
```ts
import { type Locale } from '@/i18n/routing';

export const runtime = 'nodejs';
```
REPLACE:
```ts
import { type Locale } from '@/i18n/routing';
import {
  LlmNotConfiguredError,
  getLlmConfig,
  getMaxTurns,
  probeLlm,
  type LlmConfig,
} from '@/lib/ai/provider';

export const runtime = 'nodejs';
```

- [ ] **Step 2: Edit 2 — drop the inline provider constants**

SEARCH:
```ts
// Gemini's OpenAI-compatible endpoint + a cheap, tool-calling-capable default.
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-2.5-flash';
// Dual-locale copy, describe_block lookups, resource searches, and one-structural-edit-
// at-a-time mean a full page build runs long. At 16 the loop stopped mid-build, leaving a
// half-finished page.
const MAX_TURNS = 28;
```
REPLACE:
```ts
// Provider defaults now live in lib/ai/provider.ts so both AI surfaces share them.
// Dual-locale copy, describe_block lookups, resource searches, and one-structural-edit-
// at-a-time mean a full page build runs long. At 16 the loop stopped mid-build, leaving a
// half-finished page. Overridable with ASSISTANT_LLM_MAX_TURNS for slow local models.
const DEFAULT_MAX_TURNS = 28;
```

- [ ] **Step 3: Edit 3 — build the client through the provider**

SEARCH:
```ts
  const apiKey = process.env.ASSISTANT_LLM_API_KEY;
  if (!apiKey) return bad(500, 'Assistant is not configured.');
  const baseURL = process.env.ASSISTANT_LLM_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.ASSISTANT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey, baseURL });
```
REPLACE:
```ts
  let cfg: LlmConfig;
  try {
    cfg = getLlmConfig();
  } catch (err) {
    if (err instanceof LlmNotConfiguredError) return bad(500, err.message);
    throw err;
  }
  const { client, model } = cfg;
  const maxTurns = getMaxTurns(DEFAULT_MAX_TURNS);
```

- [ ] **Step 4: Edit 4 — probe before the loop, and apply tuning**

SEARCH:
```ts
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const result = await client.chat.completions.create({
            model,
            max_tokens: MAX_TOKENS,
            tools: ASSISTANT_TOOLS,
            tool_choice: 'auto',
            messages,
            stream: true,
          });
```
REPLACE:
```ts
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
```

The `return` inside the ReadableStream `start` body is correct: the `finally` block still runs, so `done` is sent and the controller closes.

- [ ] **Step 5: Edit 5 — remove the now-unused OpenAI import**

SEARCH:
```ts
import OpenAI from 'openai';
import type {
```
REPLACE:
```ts
import type {
```

- [ ] **Step 6: Run the assistant test suite**

Run: `node_modules/.bin/vitest run lib/__tests__/assistant-*.test.ts app/api/page-builder/assistant`
Expected: PASS, no failures.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `node_modules/.bin/vitest run`
Expected: PASS — all pre-existing tests still green.

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output. If it reports `'OpenAI' is declared but never read`, Edit 5 was not applied.

- [ ] **Step 8: Commit**

```bash
git add app/api/page-builder/assistant/route.ts
git commit -m "refactor(assistant): build the llm client through the shared provider"
```

---

### Task 3: Document the local-Qwen configuration

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the env names from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the local block to `.env.example`**

Find the existing `ASSISTANT_LLM_API_KEY=` line (around line 118) and insert this block immediately above it:

```bash
# Local model (llama.cpp / Qwen3.6-35B-A3B). Start the server first:
#   ~/llama.cpp/run-qwen.sh
#   ASSISTANT_LLM_BASE_URL=http://127.0.0.1:8080/v1
#   ASSISTANT_LLM_MODEL=qwen3.6-35b-a3b
#   ASSISTANT_LLM_API_KEY=local        # must be non-empty; llama.cpp ignores it on loopback
# If the Next app runs inside Docker, 127.0.0.1 is the container — use the docker0
# bridge instead: ASSISTANT_LLM_BASE_URL=http://172.17.0.1:8080/v1
#
# Optional, both surfaces:
#   ASSISTANT_LLM_MAX_TURNS=8          # cap the tool loop; default 28 for the page builder
#   ASSISTANT_LLM_THINKING=on          # default off — Qwen bills reasoning to max_tokens
```

- [ ] **Step 2: Add the context note to `CLAUDE.md`**

Append to the `## Context` section at the end of the file:

```markdown
### AI assistant provider
Both AI surfaces build their LLM client through `lib/ai/provider.ts`, configured by
`ASSISTANT_LLM_BASE_URL` / `_MODEL` / `_API_KEY`. Switching between the local Qwen
(llama.cpp on `http://127.0.0.1:8080/v1`) and a cloud endpoint is an `.env` edit, never a
code change. Qwen needs `chat_template_kwargs: { enable_thinking: false }` or it spends the
whole token budget on reasoning and returns empty content — that correction lives in
`buildTuning()`.
```

- [ ] **Step 3: Verify nothing else broke**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs(ai): document the local qwen provider configuration"
```

---

## Manual verification

After Task 3, with `~/llama.cpp/run-qwen.sh` running and `.env` pointed at
`http://127.0.0.1:8080/v1`:

1. Open `/build` on any page, ask the assistant to change a heading. Expect a streamed reply and an applied mutation. It will be markedly slower than the cloud provider — that is expected at ~40 tok/s.
2. Stop the llama.cpp server and repeat. Expect the chat to show "Local model is not running at http://127.0.0.1:8080/v1. Start it with ~/llama.cpp/run-qwen.sh" — **not** a raw `ECONNREFUSED`.
3. Set `ASSISTANT_LLM_BASE_URL` back to OpenRouter and confirm the assistant still works, proving the cloud path is intact.
