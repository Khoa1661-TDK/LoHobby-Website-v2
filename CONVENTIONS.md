# Conventions

Read this before writing code. It is short on purpose — every line is sent on every turn.

## Control flow

- Prefer a lookup object or `Map` over an `else if` chain longer than two branches.
  Dispatching on a string or enum should be a table keyed by that value, not a ladder.
- Use early returns for guards. Do not nest the happy path inside an `if`.
- A `switch` is acceptable when each case does real work; a chain of `else if` that only
  assigns a value is not — that is a lookup.

## Scope

- Match the surrounding file's existing patterns, naming, and error handling, even if you
  would have chosen differently. Flag a bad pattern separately; do not silently fix it.
- Never mix a refactor into a feature change.
- Make the smallest change that achieves the goal. Do not rewrite code you were not asked
  to touch.

## Repo traps (these have each broken production here)

- **No character-class regex in `lib/`.** Tailwind scans `lib/`, and a regex with square
  brackets there has destroyed the entire stylesheet and 500'd every page. Use
  `.includes()` / `.startsWith()` in `lib` code.
- **Never top-level `import` `@payload-config` from a lib module** that a Payload
  collection can reach. It causes a TDZ crash — "Cannot access 'j' before initialization"
  — on every Payload route. Use a lazy `await import()`, or take `payload` as a parameter.
- **Payload relationship ids must be numeric.** `defaultIDType` is `number`; writing a
  `String()` id is rejected. Look the id up, never guess it.
- **No new Payload fields or collections** without being asked. They require a generated
  migration, and missing one throws `42P01` at runtime.
- Payload `join` fields return bare ids at depth 0. Read them with `depth: 1` or the
  related values are unreadable.

## Tests

- Test files must `import { describe, it, expect } from 'vitest'`. `globals: true` is
  runtime-only and `tsc --noEmit` fails without the import.
- Tests live in the flat `lib/__tests__/`, `app/**/__tests__/`, `components/**/__tests__/`
  or `src/**/__tests__/` directories. A test outside those globs is **silently skipped**.
- Cover the failure paths, not just the happy path.

## Commands

- `pnpm <script>` fails in this repo via `runDepsStatusCheck`. Call the binaries directly:
  `node_modules/.bin/vitest run` and `node_modules/.bin/tsc --noEmit`.
