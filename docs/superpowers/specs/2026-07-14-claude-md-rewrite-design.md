# CLAUDE.md Rewrite — Design Spec

## Purpose
The current `CLAUDE.md` (360 lines) is dominated by static reference material
(tech stack table, full directory tree, routing list, component hierarchy,
data-flow prose) that is fully derivable by reading the code. It also encodes
an execution-strategy decision (inline-first, 2026-06-29) that the user now
wants replaced with a symmetric, cost-based policy, plus two new workflow
requirements: a mandatory adversarial self-test gate, and a running session log.

## Goals
- Cut CLAUDE.md to rules + non-obvious gotchas only; drop anything derivable
  from `ls`/`grep`/reading the code.
- Replace the inline-first subagent policy with a symmetric cost estimate:
  whichever (subagent vs. inline) costs fewer total tokens wins, no default bias.
- Add a MUST gate: before declaring any non-trivial change done, spawn a
  dedicated adversarial subagent to try to break the diff (report-only, no
  fixing); real findings get fixed inline before the gate passes. Applies
  automatically to every non-trivial change (not skill- or phase-gated).
  Trivial one-liners/typo fixes are exempt.
- Add an explicit simplicity/hard-to-break-in-code principle: smallest correct
  implementation, no speculative abstractions, validate only at real boundaries.
- Add a new append-only `SESSIONS.md` activity log (distinct from
  `DECISIONS.md`, which stays reserved for technical decisions with
  alternatives/trade-offs). One entry per session: what changed, files
  touched, what's next.
- Add a context-hunger self-check (MUST): if confidence in the available
  context is low, stop and ask the user — even when running autonomously —
  rather than guessing or filling gaps with invented specifics.

## Non-Goals
- Not touching `DECISIONS.md`'s existing format or content.
- Not moving reference material into a separate `docs/ARCHITECTURE.md` —
  it's being cut, not relocated (per user decision: architecture is derivable
  from code, keep only true gotchas).
- Not changing the global `@rules/common/*.md` imports or their content.
- Not changing the solo-project git workflow (commit directly to main).

## New CLAUDE.md Structure

```
# Ecommerce-Web (Lô Hobby)

## What This Is
(1-2 line description, unchanged)

## Architecture Gotchas
Non-obvious only:
- Dual-DB: Payload owns its schema (products/orders/content); a separate
  Prisma schema (generated → generated/prisma/, non-default path) owns
  coupons/gift cards/campaigns, on the same Postgres instance. Neither ORM
  sees the other's tables directly.
- auth.config.ts must stay edge-safe (no Prisma/bcrypt imports) — runs in
  middleware. auth.ts extends it with the Prisma adapter for the Node runtime.
- Caching is tag-based, manual-revalidate-only (revalidate: false +
  revalidateTag() in afterChange hooks). Seed scripts don't bust the dev
  server's cache — restart dev after seeding.
- "ShopNex" in package/plugin names is the underlying commerce template this
  repo is built on, not a separate product.

## Current Phase
Pointer only — check .claude/phases/ before starting work.

## Rules
### Always active
@rules/common/core.md
@rules/common/decisions.md
@rules/common/git.md
@rules/common/testing.md
@rules/common/debug.md
@rules/common/existing-code.md
@rules/common/frontend.md

### Project-Specific Constraints

**Git workflow (overrides global git rules):** solo project, commit directly
to main, no branches/PRs required. Atomic commits, Conventional Commit
messages still apply. (User decision, 2026-06-22.)

**Subagent policy (cost-based, symmetric):** before starting any non-trivial
task, estimate whether a subagent or inline work costs fewer total tokens.
Whichever is cheaper wins — no default bias toward inline or toward
subagents. Broad multi-file searches, isolated implementation chunks, and
genuinely parallel independent work usually favor subagents; single-file
edits and directed lookups usually favor inline. When genuinely unsure, do
it inline (cheaper to reason about, not a tiebreaker rule).

**Break-it-yourself gate (MUST, every non-trivial change):** before
declaring implementation work done, spawn a subagent whose only job is to
try to break the diff — bad input, boundary values, concurrent access,
wrong assumptions. It reports findings; it does not fix. Real findings get
fixed inline, then the gate is considered passed. Skip only for trivial
one-liners/typo fixes.

**Simplicity / hard-to-break-in code (MUST):** prefer the smallest correct
implementation over a defensible/extensible one. No speculative
abstractions, no config flags for one call site, no defensive checks for
states that can't occur. Validate only at real boundaries (user input,
external APIs, webhooks). Fewer moving parts = fewer ways in.

**Session summary (MUST, end of every work session):** append one entry to
SESSIONS.md — what changed, files touched, what's next. Do not duplicate
DECISIONS.md (that's for technical decisions with alternatives/trade-offs);
SESSIONS.md is a plain activity log.

**Context hunger self-check (MUST):** before acting — including in
autonomous/auto mode — assess whether you actually have enough context
(codebase state, requirements, prior decisions) to proceed correctly. If
not, stop and ask the user rather than guessing, assuming, or inventing
specifics (file contents, APIs, prior conversation details) to fill the
gap. This overrides the "be autonomous" default: autonomy applies to
low-risk reversible choices with sufficient context, not to filling
knowledge gaps. Do not hallucinate — if something can't be verified
(a file, a function, a fact), check it or say you don't know.
```

## New File: SESSIONS.md
Append-only, chronological (oldest to newest, matching DECISIONS.md order).
Entry format:
```markdown
## YYYY-MM-DD — [short title]
**Did:** one or two sentences, what shipped
**Files:** key paths touched
**Next:** what's still open, if anything
```

## What Gets Cut From Current CLAUDE.md
Tech stack table (unfilled boilerplate), full directory tree, routing list,
component hierarchy, data-flow/payment-flow prose, auth-flow numbered list —
all derivable by reading `app/`, `package.json`, `lib/`, `src/payload/`
directly. Approximately 280 of the current 360 lines are removed.

## Decisions Made During Brainstorming
- **Subagent policy reversal scope:** user rejected both "flip fully back to
  subagent-first" and "keep inline-first, subagents only for break-it" in
  favor of a symmetric cost estimate with no default bias either direction.
- **Break-it trigger:** every non-trivial change, automatically — not gated
  behind a specific skill or phase completion.
- **Break-it mechanism:** a dedicated adversarial subagent (report-only),
  not a reuse of existing code-review/verify skills, and not inline
  adversarial test-writing.
- **Session summary location:** a new dedicated `SESSIONS.md`, not appended
  to `DECISIONS.md` and not left as chat-only.
- **Doc trimming approach:** cut derivable architecture content entirely
  (per existing-code.md's own principle) rather than relocating it to a
  separate docs file.
- **Context hunger self-check:** added mid-review (user follow-up) as a
  MUST — explicitly carves out an exception to the "be autonomous" default:
  low context confidence means stop and ask, even in auto mode, rather than
  hallucinating specifics.
