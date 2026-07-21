# Unaccented Vietnamese Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make product search match the way Vietnamese shoppers actually type — without diacritics, in any word order — so that `mo hinh`, `do choi`, and `bonk cheems` stop returning zero results.

**Architecture:** Extract query parsing into a new pure module `lib/search-query.ts` (deaccent, tokenize, build the Payload `Where`), unit-test it in isolation, then replace the single inline `where` expression in `lib/payload-products.ts:573-581` with a call to it. The current filter is one `or` of three `contains` clauses against the raw query string; it becomes an `and` over tokens, where each token must match the title, the description, or the slug — with a diacritic-stripped fallback against the slug. No database migration, no Postgres `unaccent` extension, no schema change.

**Tech Stack:** TypeScript (strict), Payload CMS 3.x query API (`Where`), Vitest.

## Global Constraints

- Test files MUST import `describe`/`it`/`expect` from `vitest` explicitly — `globals: true` is runtime-only and `tsc --noEmit` fails without the imports.
- Invoke binaries directly (`node_modules/.bin/vitest`, `node_modules/.bin/tsc`); `pnpm <script>` fails in this environment via `runDepsStatusCheck`.
- Pure-logic tests live in `lib/__tests__/**/*.test.ts` and run under the Vitest `node` project.
- Test names follow `should [behavior] when [condition]`.
- Commit messages use Conventional Commits; commit directly to `main` (solo project).
- Do NOT change the visible search UI, the debounce, or the 2-character minimum in this plan — that is spec §6b and is out of scope here.

## Why this fix works

Product slugs are already stored in unaccented, hyphenated form (`mo-hinh-cheems-bonk`), while titles carry full diacritics (`mô hình cheems bonk`). Today the query string is matched whole against both, so:

| Query | Today | Why |
|---|---|---|
| `mô hình` | 6 results | matches the title verbatim |
| `mo hinh` | **0** | the space cannot match the slug's hyphen |
| `đồ chơi` | 6 results | matches the title verbatim |
| `do choi` | **0** | same hyphen problem, plus `đ` ≠ `d` |
| `cheems bonk` | 1 result | contiguous substring of the slug |
| `bonk cheems` | **0** | wrong order, so no contiguous match |

Splitting the query into tokens and requiring each token to appear *somewhere* removes the contiguity requirement (fixing word order), and matching a diacritic-stripped token against the already-unaccented slug removes the diacritic requirement. One change fixes all three rows.

---

### Task 1: Pure query-parsing module

**Files:**
- Create: `lib/search-query.ts`
- Test: `lib/__tests__/search-query.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces, for Task 2:
  - `deaccentText(input: string): string`
  - `tokenizeSearchQuery(query: string): string[]`
  - `buildProductSearchWhere(query: string | undefined): Where` — `Where` imported from `payload`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/search-query.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildProductSearchWhere,
  deaccentText,
  tokenizeSearchQuery,
} from '@/lib/search-query';

describe('deaccentText', () => {
  it('should strip Vietnamese tone and vowel marks when given accented text', () => {
    expect(deaccentText('mô hình')).toBe('mo hinh');
    expect(deaccentText('móc khóa')).toBe('moc khoa');
  });

  it('should fold d-stroke to d when given the Vietnamese letter đ', () => {
    // đ (U+0111) is a distinct letter, not a combining mark, so NFD does not
    // decompose it. Without this the query "do choi" cannot reach "đồ chơi".
    expect(deaccentText('đồ chơi')).toBe('do choi');
    expect(deaccentText('Đồ')).toBe('Do');
  });

  it('should leave unaccented text unchanged when there is nothing to strip', () => {
    expect(deaccentText('cheems bonk')).toBe('cheems bonk');
  });

  it('should return an empty string when given an empty string', () => {
    expect(deaccentText('')).toBe('');
  });
});

describe('tokenizeSearchQuery', () => {
  it('should split on whitespace and lowercase when given a multi-word query', () => {
    expect(tokenizeSearchQuery('Mo Hinh')).toEqual(['mo', 'hinh']);
  });

  it('should treat hyphens and underscores as separators when given a slug-like query', () => {
    expect(tokenizeSearchQuery('mo-hinh_cheems')).toEqual(['mo', 'hinh', 'cheems']);
  });

  it('should collapse repeated separators when given padded input', () => {
    expect(tokenizeSearchQuery('  mo   hinh  ')).toEqual(['mo', 'hinh']);
  });

  it('should return an empty array when given only separators', () => {
    expect(tokenizeSearchQuery('   ---  ')).toEqual([]);
  });
});

describe('buildProductSearchWhere', () => {
  it('should match everything when given an undefined query', () => {
    expect(buildProductSearchWhere(undefined)).toEqual({});
  });

  it('should match everything when given a whitespace-only query', () => {
    expect(buildProductSearchWhere('   ')).toEqual({});
  });

  it('should require every token when given a multi-word query', () => {
    const where = buildProductSearchWhere('mo hinh');
    expect(where.and).toHaveLength(2);
  });

  it('should offer title, description and slug alternatives for an unaccented token', () => {
    const where = buildProductSearchWhere('mo');
    expect(where.and?.[0]).toEqual({
      or: [
        { title: { contains: 'mo' } },
        { description: { contains: 'mo' } },
        { slug: { contains: 'mo' } },
      ],
    });
  });

  it('should add a deaccented slug alternative when the token carries diacritics', () => {
    const where = buildProductSearchWhere('hình');
    expect(where.and?.[0]).toEqual({
      or: [
        { title: { contains: 'hình' } },
        { description: { contains: 'hình' } },
        { slug: { contains: 'hình' } },
        { slug: { contains: 'hinh' } },
      ],
    });
  });

  it('should produce an order-independent filter when given reordered tokens', () => {
    // "cheems bonk" and "bonk cheems" must yield the same set of AND clauses,
    // just permuted -- this is what fixes word-order sensitivity.
    const forward = buildProductSearchWhere('cheems bonk').and;
    const reverse = buildProductSearchWhere('bonk cheems').and;
    expect(forward).toEqual(expect.arrayContaining(reverse ?? []));
    expect(reverse).toEqual(expect.arrayContaining(forward ?? []));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
node_modules/.bin/vitest run lib/__tests__/search-query.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/search-query"`.

- [ ] **Step 3: Write the implementation**

Create `lib/search-query.ts`:

```ts
// lib/search-query.ts — query parsing for storefront product search.
//
// Product slugs are stored unaccented and hyphenated (`mo-hinh-cheems-bonk`)
// while titles keep full diacritics (`mô hình cheems bonk`). Matching the raw
// query string against both means an unaccented multi-word query ("mo hinh")
// matches neither: the space cannot span the slug's hyphen, and "mo" is not
// "mô". Tokenising the query and requiring each token independently removes
// both the contiguity and the diacritic requirement.
import type { Where } from 'payload';

/**
 * Strip Vietnamese diacritics so an unaccented query can reach accented data.
 *
 * NFD decomposition separates tone and vowel marks into combining characters
 * that are then dropped. `đ`/`Đ` (U+0111/U+0110) are distinct letters rather
 * than decomposable forms, so they are folded explicitly — without that,
 * "do choi" can never match "đồ chơi".
 */
export function deaccentText(input: string): string {
  return input
    .normalize('NFD')
    // U+0300–U+036F is the Combining Diacritical Marks block that NFD splits
    // tone and vowel marks into. Written as escapes deliberately: the literal
    // characters are invisible and do not survive copy-paste intact.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Lowercase and split a query on whitespace, hyphens, underscores and slashes. */
export function tokenizeSearchQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((token) => token.length > 0);
}

/**
 * Build the Payload filter for a product search.
 *
 * Every token must match somewhere (AND), and each token may match the title,
 * the description or the slug (OR). Tokens carrying diacritics additionally try
 * their stripped form against the slug, which is already stored unaccented.
 *
 * An empty or separator-only query yields `{}` — match everything — preserving
 * the previous behaviour for an absent query.
 */
export function buildProductSearchWhere(query: string | undefined): Where {
  const tokens = tokenizeSearchQuery(query ?? '');
  if (tokens.length === 0) return {};

  return {
    and: tokens.map((token) => {
      const alternatives: Where[] = [
        { title: { contains: token } },
        { description: { contains: token } },
        { slug: { contains: token } },
      ];

      const plain = deaccentText(token);
      if (plain !== token) {
        alternatives.push({ slug: { contains: plain } });
      }

      return { or: alternatives };
    }),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node_modules/.bin/vitest run lib/__tests__/search-query.test.ts
```

Expected: PASS — 14 tests passed.

- [ ] **Step 5: Typecheck**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no output (clean exit).

- [ ] **Step 6: Commit**

```bash
git add lib/search-query.ts lib/__tests__/search-query.test.ts
git commit -m "feat(search): add diacritic-folding query tokenizer

Vietnamese shoppers routinely type without diacritics, but product
search matched the raw query string against title and slug, so
\"mo hinh\" and \"do choi\" returned nothing. Adds a pure module that
strips tone marks, folds the distinct letter d-stroke to d, and splits
a query into tokens for order-independent matching.

Not yet wired into the catalog query -- that follows.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Wire the tokenizer into the catalog query

**Files:**
- Modify: `lib/payload-products.ts:573-581` (the `where` expression inside `fetchPayloadProducts`)
- Test: `lib/__tests__/search-query.test.ts` (already created in Task 1 — no new test file)

**Interfaces:**
- Consumes: `buildProductSearchWhere(query: string | undefined): Where` from Task 1.
- Produces: no new exports. `fetchPayloadProducts`, `getPayloadProducts`, and `getProducts` keep their existing signatures, so `app/api/search/suggest/route.ts` and the `/search` page need no changes.

- [ ] **Step 1: Read the current code**

Open `lib/payload-products.ts` and locate `fetchPayloadProducts` (starts line 566). The block to replace is:

```ts
  const where: Where = opts?.query
    ? {
        or: [
          { title: { contains: opts.query } },
          { description: { contains: opts.query } },
          { slug: { contains: opts.query } },
        ],
      }
    : {};
```

- [ ] **Step 2: Replace it with a call to the new module**

```ts
  const where: Where = buildProductSearchWhere(opts?.query);
```

- [ ] **Step 3: Add the import**

Add to the existing import block at the top of `lib/payload-products.ts`, keeping the file's alphabetical `@/lib/...` ordering:

```ts
import { buildProductSearchWhere } from '@/lib/search-query';
```

- [ ] **Step 4: Remove the now-unused `Where` import if it is orphaned**

`Where` is still used as the type annotation on the `where` const, so the existing `import type { Where } from 'payload'` stays. Confirm with:

```bash
grep -n "Where" lib/payload-products.ts
```

Expected: at least the import line and the `const where: Where` line. If `Where` appears nowhere else and the annotation was dropped, remove the import — otherwise leave it.

- [ ] **Step 5: Run the full test suite**

```bash
node_modules/.bin/vitest run
```

Expected: PASS. No existing test asserts on the old `or`-shaped filter; if one does, it is testing the removed behaviour and must be updated to the new AND-of-OR shape rather than reverted.

- [ ] **Step 6: Typecheck**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add lib/payload-products.ts
git commit -m "fix(search): match unaccented and reordered Vietnamese queries

Replaces the single whole-string OR filter with an AND over query
tokens, each matching title, description or slug, plus a deaccented
slug fallback. Fixes three live defects measured against the deploy:

  \"mo hinh\"     0 -> matches \"mô hình\"
  \"do choi\"     0 -> matches \"đồ chơi\"
  \"bonk cheems\" 0 -> matches regardless of word order

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Verify against the deployed instance

**Files:** none — verification only.

**Interfaces:**
- Consumes: the deployed build containing Tasks 1 and 2.
- Produces: a pass/fail record for the spec §6a acceptance criteria.

This task cannot run until the user has rebuilt the image and redeployed via Portainer — the agent shell cannot reach the Docker daemon. Ask for the redeploy, then run the probes below.

- [ ] **Step 1: Request redeploy**

Ask the user to build and push the image and pull it in Portainer, then confirm.

- [ ] **Step 2: Probe the previously-failing queries**

```bash
B=http://116.118.6.30:3000
for q in "mo hinh" "mô hình" "MO HINH" "do choi" "đồ chơi" "bonk cheems" "cheems bonk" "moc khoa" "móc khóa"; do
  printf "%-14s " "$q"
  curl -s -m 20 --get --data-urlencode "q=$q" "$B/api/search/suggest" \
    | python3 -c "import sys,json;s=json.load(sys.stdin)['suggestions'];print(len(s),'|',s[0]['title'][:38] if s else '')"
done
```

Expected: every query returns a non-empty result set. `mo hinh` / `mô hình` / `MO HINH` return the same count; `do choi` / `đồ chơi` return the same count; `bonk cheems` / `cheems bonk` return the same count.

- [ ] **Step 3: Confirm the full results page agrees with the dropdown**

```bash
curl -s -m 30 "http://116.118.6.30:3000/vi/search?q=mo+hinh" -o /tmp/s.html -w "status=%{http_code}\n"
grep -c 'href="/vi/product/' /tmp/s.html
```

Expected: HTTP 200 and a non-zero count of product links — the `/search` page and the suggestion endpoint share `getProducts`, so both must recover together.

- [ ] **Step 4: Confirm no-match still degrades cleanly**

```bash
curl -s -m 20 --get --data-urlencode "q=zzzqqq nothing" \
  "http://116.118.6.30:3000/api/search/suggest"
```

Expected: exactly `{"suggestions":[]}` with HTTP 200 — not an error, not the whole catalogue.

- [ ] **Step 5: Record the result**

If every probe passes, mark spec §6a complete. If any fails, do NOT patch speculatively — capture the failing query and its response, and diagnose against `buildProductSearchWhere` output for that exact string first.

---

## Self-review

**Spec coverage.** Spec §6a lists five acceptance criteria: case/spacing-insensitive equivalence for `mo hinh` (Task 3 Step 2), `moc khoa` equivalence (Task 3 Step 2), empty result still returning `[]` and HTTP 200 (Task 3 Step 4), the `/search` page agreeing with the dropdown (Task 3 Step 3), and unit tests covering diacritics, case folding, space/hyphen equivalence, multi-token matching and empty input (Task 1 Step 1). All five are covered.

**Beyond the spec.** Word-order independence (`bonk cheems`) and `đ`-folding (`do choi`) were measured after the spec was written. Both are consequences of the same fix and are covered by tests in Task 1 and probes in Task 3.

**Type consistency.** `deaccentText`, `tokenizeSearchQuery`, and `buildProductSearchWhere` are named identically in Task 1's implementation, Task 1's tests, and Task 2's call site. `Where` is imported from `payload` in both `lib/search-query.ts` and `lib/payload-products.ts`.

**Known risk.** `{ description: { contains: token } }` is carried over unchanged from the existing filter. If `description` is a Lexical richText field, `contains` may not match its JSON structure — but that is pre-existing behaviour, not a regression introduced here, and the title and slug clauses carry the match. Do not "fix" it in this plan; note it if Task 3 shows description-only matches failing.

**Scope note.** Search combobox accessibility (spec §6b) touches the same component file but is deliberately excluded — it is a separate plan and must be done after this one to avoid conflicting edits.
