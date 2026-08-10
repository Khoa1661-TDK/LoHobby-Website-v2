# Local Qwen Assistant + Admin Content-Management Assistant — Design

Date: 2026-08-10
Status: Approved (design), pending implementation plan

## 1. Goal

Two deliverables, one design:

1. **Run both AI assistants on the local Qwen model** (`Qwen3.6-35B-A3B` on llama.cpp at
   `http://127.0.0.1:8080/v1`) instead of a paid cloud endpoint.
2. **Add an AI assistant to the Payload admin** that handles four job families in natural
   language: jump to a setting, confirm/advance orders, change product pictures, and change
   product/global options.

The implementor is the local Qwen model driven through Aider (128k context, reliable only when
scoped to explicitly named files). Every design choice below is biased toward *small,
independent, individually testable files*.

### Non-goals

- No new database tables, columns, or Payload fields → **no Payload migration**.
- No refactor of the existing page-builder assistant's tool loop (see §11, Rejected).
- No production/VPS reach. The assistant is a dev-machine feature; when
  `ASSISTANT_LLM_BASE_URL` is unreachable the UI degrades to a clear error.
- No new order/product business logic. Every write path already exists and is reused.

## 2. Existing assets (reuse, do not rebuild)

| Asset | Location | Use |
|---|---|---|
| Streaming OpenAI tool loop | `app/api/page-builder/assistant/route.ts` | Reference implementation for the new generic loop |
| NDJSON stream parser | `lib/page-builder/assistant/parse-stream.ts` | Generalized into `lib/ai/parse-ndjson.ts` |
| Admin session guard | `lib/page-builder/admin-guard.ts` (`isAuthorizedAdmin`) | Reused verbatim |
| Media + catalog search | `lib/page-builder/assistant/resource-search.ts` (`searchMedia`, `searchCatalog`) | Reused verbatim |
| All 7 order operations | `lib/order-fulfillment.ts` via `lib/order-transitions.ts` | Wrapped by a single tool |
| Order action entry point | `app/(payload)/admin/orders/actions.ts` → `runOrderAction(docId, action, input?)` | The only order write path |
| Rate limiting | `lib/rate-limit.ts` + `middleware.ts` | New `adminAssistant` preset |

`runOrderAction` already calls `requireAdmin()`, validates the action with `isOrderAction`,
dispatches to the right fulfillment function, and revalidates every affected path. The
assistant must never bypass it.

## 3. Local Qwen provider

### 3.1 Configuration

Both surfaces share the existing env triple. Switching model is a `.env` edit, never a code
change — the cloud path stays fully intact so a bad local session is one line away from
recovery.

```
ASSISTANT_LLM_BASE_URL=http://127.0.0.1:8080/v1
ASSISTANT_LLM_MODEL=qwen3.6-35b-a3b
ASSISTANT_LLM_API_KEY=local
```

`ASSISTANT_LLM_API_KEY` must be non-empty — `route.ts` returns 500 "Assistant is not
configured" otherwise. llama.cpp ignores the value when bound to `127.0.0.1`.

If the Next app runs inside Docker on the dev machine, `127.0.0.1` resolves to the container.
Use `http://172.17.0.1:8080/v1` (docker0 bridge) and document it in `.env.example`.

Two optional overrides, both read by the shared provider:

```
ASSISTANT_LLM_MAX_TURNS=      # default 28 (page builder), 8 (admin)
ASSISTANT_LLM_THINKING=off    # off | on — default off
```

### 3.2 `lib/ai/provider.ts` (shared, new)

The single place that knows anything model-specific.

```ts
export type LlmConfig = {
  client: OpenAI;
  model: string;
  /** Extra params to spread into every chat.completions.create call. */
  tuning: Record<string, unknown>;
  isLocal: boolean;
};

/** Throws LlmNotConfiguredError when ASSISTANT_LLM_API_KEY is unset. */
export function getLlmConfig(): LlmConfig;

/** Probe GET {baseURL}/models with a 3s timeout. Returns null when reachable,
 *  or a human-readable reason when not. Only runs when isLocal. */
export async function probeLlm(cfg: LlmConfig): Promise<string | null>;
```

`tuning` is where the four Qwen corrections live:

| Setting | Value | Reason |
|---|---|---|
| `chat_template_kwargs` | `{ enable_thinking: false }` | Qwen3.6 reasons by default and bills it to `max_tokens`; with thinking on, `content` returns empty and `finish_reason` is `length`. A top-level `reasoning` request field is silently ignored — only `chat_template_kwargs` works. |
| `temperature` | `0.2` | llama.cpp's server default is `1.0`; too loose for tool-call JSON. |
| `top_p` / `top_k` | `0.8` / `20` | Qwen non-thinking sampling recommendation. |
| `parallel_tool_calls` | `false` | The loop applies mutations sequentially and echoes state back between calls; parallel calls would reason against stale state. Ignored harmlessly by providers that don't support it. |

`isLocal` is true when the base URL host is `127.0.0.1`, `localhost`, or a private-range IP.
Tuning is applied unconditionally (the values are sane for cloud models too), but `probeLlm`
only runs when `isLocal` — a cloud outage is not worth a round trip.

### 3.3 Changes to the existing page-builder route

Surgical only. Four edits to `app/api/page-builder/assistant/route.ts`:

1. Replace the inline `new OpenAI({ apiKey, baseURL })` + `DEFAULT_*` constants with
   `getLlmConfig()`.
2. Spread `...cfg.tuning` into the `chat.completions.create` call.
3. Read `MAX_TURNS` from `ASSISTANT_LLM_MAX_TURNS` with the current 28 as the default.
4. Before the loop, `await probeLlm(cfg)`; on a non-null result, send
   `{ type: 'error', error }` + `{ type: 'done' }` and return.

Nothing else in that file moves. Its 501 existing tests must stay green.

## 4. Admin assistant architecture

### 4.1 The propose/apply split

**The agent never writes.** This is the central decision.

```
AdminAssistantPanel (client, mounted on every admin route)
   │  POST /api/admin-assistant          → NDJSON event stream
   ▼
runAgentLoop (lib/ai/agent-loop.ts)
   ├── read tool  → executes against Payload, result returned to the model
   └── write tool → validates ONLY, returns "STAGED: …" to the model
                    and emits { type: 'proposal', proposal } to the client
   ▼
Panel renders a proposal card with Confirm / Discard
   │  POST /api/admin-assistant/apply    → { proposal }
   ▼
Apply route re-validates from scratch, then calls the existing domain function
```

Rationale:

- A 35B local model misreading an order snapshot must not be able to confirm, cancel, or
  refund a real order. A human click stands between intent and money.
- It keeps the streaming loop stateless — no pausing mid-stream for human input, no proposal
  tokens to sign, no server-side session store.
- Every write tool becomes a pure validator with no database access, so it is unit-testable
  with no Payload instance. This is the single biggest simplification for the implementor.
- It mirrors the page-builder assistant's proven "emit mutation, client applies" shape.

The apply route **re-validates the proposal from scratch**. The client is not trusted; the
proposal that arrives at `/apply` is treated exactly like untrusted input, and passes through
the same validator the tool used.

### 4.2 Module layout

```
lib/ai/
  provider.ts          # §3.2 — shared with the page builder
  parse-ndjson.ts      # generic NDJSON reader
  agent-loop.ts        # generic streaming tool-use loop
lib/admin-assistant/
  types.ts             # AdminTool, ToolContext, Proposal, AdminEvent
  registry.ts          # imports every tool, exports ADMIN_TOOLS + toolByName
  system-prompt.ts     # buildAdminSystemPrompt()
  apply.ts             # applyProposal(proposal, ctx) — the only write path
  tools/
    find-orders.ts  get-order.ts  find-products.ts  get-product.ts
    search-media.ts  read-settings.ts  describe-target.ts  open-admin-page.ts
    propose-order-action.ts  propose-product-update.ts
    propose-product-images.ts  propose-settings-update.ts
app/api/admin-assistant/
  route.ts             # streaming loop
  apply/route.ts       # confirm endpoint
components/admin-assistant/
  AdminAssistantPanel.tsx
  AdminAssistantLauncher.tsx
```

### 4.3 `lib/ai/agent-loop.ts`

Written by the architect before any tool work starts, so the interface is frozen. Modelled
directly on `route.ts:264-437`, including its streamed-tool-call accumulator (`id`/`name`
arrive once, `arguments` in fragments keyed by `index`).

```ts
export type LoopEvent =
  | { type: 'token'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'tool'; name: string }          // UI activity indicator
  | { type: 'data'; payload: unknown }      // surface-specific (proposal, mutation, link)
  | { type: 'done' };

export type ToolOutcome = {
  /** Text handed back to the model as the tool message. */
  content: string;
  /** Optional event forwarded to the client as { type: 'data', payload }. */
  emit?: unknown;
};

export type AgentLoopArgs = {
  cfg: LlmConfig;
  system: string;
  userContent: string | ChatCompletionContentPart[];
  tools: ChatCompletionFunctionTool[];
  dispatch: (name: string, args: unknown) => Promise<ToolOutcome>;
  maxTurns: number;
  maxTokens: number;
  send: (event: LoopEvent) => void;
  signal?: AbortSignal;
};

export async function runAgentLoop(args: AgentLoopArgs): Promise<void>;
```

Contract:

- `dispatch` never throws. It returns an outcome; error text goes in `content` prefixed
  `ERROR: ` so the model can self-correct.
- Unparseable tool arguments produce `ERROR: invalid JSON arguments` rather than aborting.
- Both streaming and non-streaming completion shapes are handled (unit tests feed plain
  objects), copied from `collectResponse` in the existing route.
- `reasoning_content` deltas are ignored, never concatenated into `content`.
- The loop stops when a turn produces no tool calls, or `maxTurns` is reached.
- `send({ type: 'done' })` fires exactly once, in a `finally`.

### 4.4 `lib/admin-assistant/types.ts`

```ts
export type ToolContext = {
  payload: BasePayload;       // injected by the route — tools NEVER import @payload-config
  locale: 'vi' | 'en';
};

export type AdminTool = {
  definition: ChatCompletionFunctionTool;
  /** Read tools return content only; write tools return a proposal. */
  run: (args: unknown, ctx: ToolContext) => Promise<ToolOutcome>;
};

export type Proposal =
  | { kind: 'orderAction'; docId: string | number; action: OrderAction;
      input?: ShipInput; summary: string }
  | { kind: 'productUpdate'; id: number; fields: Record<string, unknown>; summary: string }
  | { kind: 'productImages'; id: number; image?: number; gallery?: number[]; summary: string }
  | { kind: 'settingsUpdate'; global: AllowedGlobal;
      fields: Record<string, unknown>; summary: string };
```

`AllowedGlobal` is declared in the same file as a union of the five writable global slugs
(§5). `OrderAction` and `ShipInput` are imported from `@/lib/order-transitions` — types only,
no runtime import, so no config cycle.

`summary` is a Vietnamese one-liner rendered on the confirm card ("Xác nhận đơn #DH1042").

## 5. Tool catalog

Twelve tools. Descriptions must stay terse — the whole tool block should sit under ~3k tokens
so a 128k local window spends its budget on data, not boilerplate.

### Read tools

| Tool | Arguments | Returns |
|---|---|---|
| `find_orders` | `status?`, `query?`, `limit?` (≤25) | Compact rows: `orderCode`, `docId`, `customerName`, `total`, `paymentStatus`, `orderStatus`, `createdAt`, `availableActions` |
| `get_order` | `orderCode` \| `docId` | Full order: items, address, shipment, timestamps, `availableActions` |
| `find_products` | `query`, `collection?` (`products` \| `categories`, default `products`), `limit?` (≤25) | Products: `id`, `title`, `slug`, `price`, `stock`, `available`, `onSale`, `salePercent`. Categories: `id`, `title` only (delegates to the existing `searchCatalog`) |
| `get_product` | `id` | Adds `category`, `image`, `gallery` (media ids + filenames), variant list |
| `search_media` | `query`, `limit?` | Delegates to the existing `searchMedia` |
| `read_settings` | `global` (enum) | Flattened `path: value` map, secrets redacted |
| `describe_target` | `kind: 'product' \| global-slug` | Writable field names, types, enum values — so the model never invents a field |
| `open_admin_page` | `target`, `id?` | `{ url, label }`, emitted as a `data` event the panel renders as a link |

`availableActions` comes from `availableActions()` in `lib/order-transitions.ts`. Including it
in every order row is what lets the model pick a legal action in one turn instead of guessing
and being rejected.

`open_admin_page` is the "fast option access" feature. Its target enum maps to real URLs:

```
store-settings  → /admin/globals/store-settings
shipping        → /admin/globals/shipping-settings
notifications   → /admin/globals/notification-settings
auto-sale       → /admin/globals/auto-sale-settings
header          → /admin/globals/site-header
navigation      → /admin/globals/navigation
dropship        → /admin/globals/dropship-settings
orders          → /admin/orders
order           → /admin/collections/orders/{id}
products        → /admin/collections/products
product         → /admin/collections/products/{id}
media           → /admin/collections/media
coupons | gift-cards | campaigns | reviews | catalog-tools | analytics → /admin/{target}
page-builder    → /build
```

### Write tools (stage a proposal, never execute)

**`propose_order_action`** — `docId`, `action`, `carrierKey?`, `trackingNumber?`,
`customTrackingUrl?`

Validates: order exists; `isOrderAction(action)`; action ∈ `availableActions(order)`;
`ship` requires `carrierKey` + `trackingNumber`. Emits an `orderAction` proposal.
Covers all seven operations — `mark_paid`, `confirm`, `ship`, `sync_tracking`,
`mark_delivered`, `cancel`, `refund` — through one tool and zero new business logic.

**`propose_product_update`** — `id`, `fields`

Whitelist, nothing else accepted:

```
title (string) · price (number ≥ 0) · stock (integer ≥ 0) · available (boolean)
onSale (boolean) · salePercent (integer 0-100) · category (numeric id)
```

`category` must be resolved through `find_products({ collection: 'categories' })` first — a non-numeric id
is rejected, because Payload's relationship writes reject `String()` ids under
`defaultIDType=number`.

**`propose_product_images`** — `id`, `image?` (media id), `gallery?` (media id array)

Every id is verified to exist in the media collection before staging. This is the "change
picture" path.

**`propose_settings_update`** — `global`, `fields`

`global` ∈ `store-settings | shipping-settings | notification-settings | auto-sale-settings |
dropship-settings`. `site-header` and `navigation` are excluded — they are block/array
structures better edited in the existing visual editor at `/build/header`.

Field paths are validated against the live Payload global config: the path must exist, the
type must match, and a `select` value must be one of its declared options. Fields whose name
matches `/token|secret|key|password|webhook/i` are rejected outright even if writable.

## 6. Apply contract

`POST /api/admin-assistant/apply` — body `{ proposal: Proposal }`.

1. `isAuthorizedAdmin` guard (same as the streaming route).
2. Re-validate the proposal through the same validator its tool used. Reject on any drift.
3. Dispatch:

| kind | Executes |
|---|---|
| `orderAction` | `runOrderAction(docId, action, input)` |
| `productUpdate` | `payload.update({ collection: 'products', id, data })` |
| `productImages` | `payload.update({ collection: 'products', id, data: { image, gallery } })` |
| `settingsUpdate` | `payload.updateGlobal({ slug, data })` |

4. Response `{ ok: true, message }` or `{ ok: false, message }`, message in Vietnamese to
   match the existing admin action results.
5. `revalidatePath` for products/globals mirroring what `runOrderAction` already does for
   orders (`/admin/collections/products`, the product page, `/`).

Locale note: product and global writes go through the **active admin locale**
(`payload.update({ ..., locale })`). Localized text fields written without a locale land in
the default locale only.

## 7. UI

**`AdminAssistantLauncher.tsx`** — a fixed bottom-right button, rendered in
`app/(payload)/layout.tsx` next to `{children}`. This covers Payload's own views *and* the
custom Next pages (`/admin/orders`, `/admin/coupons`, `/admin/reviews`, …) with no
`importMap` regeneration and no Payload component registration — the friction that
`admin.components.actions` would add.

**`AdminAssistantPanel.tsx`** — slide-over, opened by the launcher. Structure follows
`components/page-builder/AssistantPanel.tsx`:

- Prompt textarea, Enter to send, Shift+Enter for newline.
- Streamed reply rendered token by token; existing `markdown-lite.ts` for formatting.
- Tool activity line ("đang tìm đơn hàng…") driven by `tool` events.
- `data` events render as cards: a link card for `open_admin_page`, a confirm card for a
  proposal (summary + Confirm/Discard). Confirmed cards collapse to their result message.
- Chat history in `localStorage` under `admin-assistant:v1`, capped at 30 entries.
- Busy state disables the input; a Stop button aborts the fetch.

No image attachments in v1. The admin surface is text-driven; vision stays with the page
builder (the local server does report `capabilities: ["completion","multimodal"]` via
`mmproj-F16.gguf`, so this is a scope choice, not a limitation).

## 8. Security

- Both routes are guarded by `isAuthorizedAdmin(payload, request.headers)` before anything
  else, including request-body parsing.
- New rate-limit preset `adminAssistant: { limit: 20, windowMs: 60_000 }` in
  `RATE_LIMIT_PRESETS`, wired in `middleware.ts` alongside the existing
  `/api/page-builder/assistant` branch.
- The apply route is the only write path and re-validates everything.
- `read_settings` and `describe_target` redact any field matching
  `/token|secret|key|password|webhook/i`.
- The model never sees customer emails or phone numbers in `find_orders` rows; `get_order`
  includes them only because fulfilment needs them.

## 9. Testing

Vitest. **Test files go in the flat `lib/__tests__/` directory**, named
`ai-*.test.ts` and `admin-assistant-*.test.ts`. This is not a style preference:
`vitest.config.ts` includes `lib/__tests__/**/*.test.ts`, `app/**/__tests__/**/*.test.ts`,
`components/**/__tests__/**/*.test.ts` and `src/**/__tests__/**/*.test.ts` only. A test in
`lib/ai/__tests__/` matches none of those patterns and is **silently skipped** — the suite
goes green for code that never ran. Route tests belong in
`app/api/admin-assistant/__tests__/`. Component tests are `.test.tsx` under
`components/**/__tests__/` (jsdom project).

- **Every tool file gets a test file, written by the architect before the implementation**
  (§14). Write tools are pure validators, so their tests need
  no Payload: feed args, assert the proposal or the error string. Read tools take a stub
  `ctx.payload` with a `find`/`findByID` fake.
- `agent-loop.ts`: fed a fake non-streaming completion object — asserts tool dispatch order,
  the `ERROR:` self-correction path, `maxTurns` termination, single `done`.
- `provider.ts`: asserts `enable_thinking: false` and sampling params are present, and that
  a missing API key throws.
- `apply.ts`: asserts each proposal kind reaches the right domain function (mocked) and that
  a tampered proposal is rejected.
- Test files **must import `describe`/`it`/`expect` from `vitest`** — `globals: true` is
  runtime-only and `tsc --noEmit` fails otherwise.
- The full existing suite must stay green, including the 501 page-builder assistant tests.

## 10. Implementor rules (hard constraints)

These encode traps this codebase has already hit:

1. **Tools never import `@payload-config`.** They receive `payload` through `ctx`. A lib
   module that top-level imports `@payload-config` and is reachable from a collection
   TDZ-crashes every Payload route with "Cannot access 'j' before initialization".
2. **No character-class regex (`[...]`) in `lib/`.** Tailwind scans `lib/`, and a bracketed
   regex there has previously destroyed the entire stylesheet, 500-ing every page. Use
   `.includes()` / `.startsWith()` in lib code.
3. **Never guess a Payload relationship id.** Look it up; write it as a number.
4. **One file per task.** No task touches two implementation files except the registry step.
5. **No new Payload fields.** If a task seems to need one, stop and ask — it would require a
   migration and this design is explicitly migration-free.
6. `pnpm <script>` fails through `runDepsStatusCheck` in this repo; call
   `node_modules/.bin/vitest` and `node_modules/.bin/tsc` directly.

## 11. Rejected alternatives

**Extracting the page-builder route's loop and pointing both surfaces at it.** Correct in the
long run, but it refactors a 453-line file backed by 501 tests inside a feature change, which
this repo's rules forbid mixing. The new generic loop is written fresh for the admin surface;
migrating the page builder onto it is a separate follow-up. The two surfaces still share
`provider.ts`, which is where all the model-specific risk lives.

**Auto-apply with undo** (the page-builder model). Fine for draft page layout; unacceptable
for refunds and cancellations. Rejected.

**Command-palette intent router** (single LLM call, no loop). Roughly 5× faster per request on
a 40 tok/s model, but cannot chain "find the pending COD orders from yesterday and confirm
them". Rejected in favour of the full agent loop, with `maxTurns: 8` and `maxTokens: 1536`
holding worst-case latency down.

**Registering the launcher via `admin.components.actions`.** Requires `importMap`
regeneration and only renders inside Payload's own views, missing the custom admin pages.
Layout mounting is strictly better here.

## 12. Known risks

- **Latency.** At ~40 tok/s a 4-turn admin exchange is roughly 20-40 s. Mitigated by thinking
  off, a 1536-token cap, terse tool schemas, and streaming so the user sees progress. If it
  proves intolerable, the fallback is one `.env` line back to OpenRouter.
- **Page-builder quality regression on Qwen.** The dual-locale block contract is a demanding
  prompt; a 35B model will follow it less reliably than Gemini Flash. Accepted knowingly by
  the user; the cloud path remains one env line away.
- **Tool-call fidelity.** If Qwen emits malformed arguments frequently, the `ERROR:`
  self-correction path costs turns. `temperature: 0.2` and required-field-only schemas are
  the mitigation; the fallback is trimming the tool set.
- **llama.cpp not running.** Handled explicitly by `probeLlm` with a named error rather than
  a raw ECONNREFUSED in the chat.

## 13. Task slicing and division of labour

The implementor is Qwen3.6-35B-A3B through Aider (~40 tok/s, `map-tokens: 0`, files named
explicitly). That model is reliable at *writing one new self-contained file against a frozen
interface* and unreliable at *subtle streaming state machines, multi-concern React, and
byte-exact edits inside large existing files*. The work is split accordingly.

### Tier A — architect writes (≈650 of ~2,400 lines)

These four are hand-written before Qwen starts, because their failure mode is silent rather
than loud: a plausible-looking wrong version passes a naive test.

| # | Deliverable | Why not Qwen |
|---|---|---|
| A1 | `lib/ai/agent-loop.ts` | The streamed tool-call accumulator (id/name arrive once, `arguments` in fragments keyed by `index`) is subtle enough that a wrong version looks right |
| A2 | `lib/admin-assistant/types.ts` | Every other task depends on this interface being exactly right |
| A3 | `components/admin-assistant/AdminAssistantPanel.tsx` | ~500 lines mixing streaming state, abort, localStorage and confirm cards; ~3 min per generation attempt at 40 tok/s makes iteration uneconomic |
| A4 | **Every test file for tiers B and C** | See §14 — this is the single highest-leverage split |

### Tier B — Qwen implements against pre-written tests

New file, frozen interface, closed loop: the task is "make
`node_modules/.bin/vitest run <test file>` pass".

| # | Deliverable | Depends on |
|---|---|---|
| B1 | `lib/ai/provider.ts` | — |
| B2 | `lib/ai/parse-ndjson.ts` | — |
| B3 | `tools/find-orders.ts` | A2 |
| B4 | `tools/get-order.ts` | A2 |
| B5 | `tools/find-products.ts` | A2 |
| B6 | `tools/get-product.ts` | A2 |
| B7 | `tools/search-media.ts` + `tools/open-admin-page.ts` | A2 |
| B8 | `tools/read-settings.ts` + `tools/describe-target.ts` | A2 |
| B9 | `tools/propose-order-action.ts` | A2 |
| B10 | `tools/propose-product-update.ts` + `tools/propose-product-images.ts` | A2 |
| B11 | `tools/propose-settings-update.ts` | A2 |
| B12 | `registry.ts` + `system-prompt.ts` | B3-B11 |
| B13 | `lib/admin-assistant/apply.ts` | B9-B11 |
| B14 | `app/api/admin-assistant/apply/route.ts` | B13 |
| B15 | `app/api/admin-assistant/route.ts` | A1, B12 |

B3-B11 are mutually independent and may run in any order or in parallel.

### Tier C — transcription tasks (verbatim edit blocks supplied)

Edits inside existing files, where Aider's SEARCH block must match byte-for-byte. The plan
carries the **literal before/after text** for each, so Qwen transcribes rather than derives.

| # | File | Edit |
|---|---|---|
| C1 | `app/api/page-builder/assistant/route.ts` | The 4 edits in §3.3 |
| C2 | `lib/page-builder/assistant/parse-stream.ts` | Delegate to `lib/ai/parse-ndjson.ts` |
| C3 | `lib/rate-limit.ts` + `middleware.ts` | `adminAssistant` preset + its middleware branch |
| C4 | `app/(payload)/layout.tsx` | Mount `AdminAssistantLauncher` beside `{children}` |
| C5 | `.env.example` + `CLAUDE.md` | Document the local-Qwen env block |

`AdminAssistantLauncher.tsx` is a ~40-line new file and rides along with C4.

## 14. Implementor workflow

**Tests come first and are not written by the implementor.** If the same model writes both the
test and the code, a misread spec produces a test that agrees with the misreading — green
suite, wrong behaviour. The architect writes every test file in tiers B and C first; Qwen's
job is to turn it green. This is the difference between "the model wrote something plausible"
and "the model wrote something correct".

Per-task Aider procedure:

1. Start `~/llama.cpp/run-qwen.sh` and confirm `curl http://127.0.0.1:8080/v1/models`.
2. One task per Aider session. `/add` the target file and its test file only.
3. `/read-only` `lib/admin-assistant/types.ts` plus one already-finished tool as a worked
   example. Nothing else — this model degrades as the file set grows.
4. Settings for the run:
   ```yaml
   edit-format: whole      # tiers A/B (new files); use diff only for tier C
   auto-test: true
   test-cmd: node_modules/.bin/vitest run
   lint-cmd: node_modules/.bin/tsc --noEmit
   ```
5. Leave reasoning ON. It roughly doubles wall-clock per task but materially improves
   adherence to a strict interface; the retries it prevents cost more than it does.
6. `auto-commits: false` stays. Review every diff before it enters git.
7. Tier C only: paste the SEARCH/REPLACE block from the plan verbatim rather than describing
   the change.

Expected cost: tier-B tool tasks run 2-4 minutes each including one retry.

## 15. Verification gates

- `node_modules/.bin/vitest run` — full suite green, including the 501 existing page-builder
  assistant tests.
- `node_modules/.bin/tsc --noEmit` — clean.
- Manual drive with llama.cpp running: ask "where do I change shipping fees" (expect a link
  card, no write), then "confirm order #<code>" (expect a proposal card, then a real status
  change after Confirm), then stop llama.cpp and re-ask (expect the named
  "local model is not running" error, not a raw ECONNREFUSED).
