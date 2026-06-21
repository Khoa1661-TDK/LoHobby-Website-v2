# Repo Consolidation & Conflict Resolution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** End with a single verified `main` branch containing the freshest code from every feature branch plus all salvaged uncommitted work, then delete every redundant branch, worktree, and stash — with a full backup taken first so nothing is ever lost.

**Architecture:** `fix/pages-duplicate-routing-import` (72d3f32) is the freshest tip — it already contains every merged PR (#1–#6: analytics, discord notifications, page-builder, i18n nav/profile, task branches). The plan merges it into `main` (after reverting main's one junk commit), salvages three pieces of unique uncommitted work (the stashed i18n catalogs, a navbar Suspense fix, the pnpm-workspace placeholder fix), verifies everything, fast-forwards `main`, and only then deletes the rest.

**Tech Stack:** git (merge/revert/stash/worktree/bundle), pnpm + direct `node_modules/.bin` binaries (Vitest, tsc, Prisma, Next.js).

---

## Established Facts (verified 2026-06-12 — do not re-derive)

| Item | State | Disposition |
|---|---|---|
| `fix/pages-duplicate-routing-import` (72d3f32) | Freshest tip; all PRs merged; 21 tsc errors, **all environmental** (missing generated Prisma client) | **Consolidation base** |
| `main` == `origin/main` (5da6252 "abc") | Only unique commit adds junk (brainstorm tmp files, worktree gitlinks) | Revert the commit |
| `feature/integration` (96543aa) | Its only unique commit is superseded — `fix/pages` has the same fixes in newer form (a517530, 0da9ca7, 72d3f32); 47 tsc errors vs fix/pages' 21 | Delete |
| `stash@{0}` (base 278e19a, 2026-06-08) | **UNIQUE WORK**: ~300 lines of i18n catalogs (footer/cart/product/checkout/auth/profile namespaces) + t() wiring across ~80 files. Never committed anywhere — the committed "Phase 03" (5e8038f) has these namespaces EMPTY | Salvage onto consolidation branch, then drop |
| Main checkout dirty files (9) | Mostly cosmetic relative→absolute import rewrites, EXCEPT `components/layout/navbar/index.tsx`: wraps `<LanguageSwitcher />` in `<Suspense>` (real fix, missing from fix/pages) | Salvage navbar fix; discard rest |
| `pnpm-workspace.yaml` on fix/pages | Contains literal placeholder text `set this to true or false` (breaks pnpm script runs) — stash has the fixed version | Salvage via stash |
| Discord worktree (`.claude/worktrees/discord-order-notifications`, on `feature/integration`) | Abandoned mid-stash-apply, 12 conflicted files | Reset + remove (stash itself is preserved) |
| `freshmain`, `freshmain2` | Identical single-commit snapshots of the (older) main checkout taken 2026-06-12; no unique content beyond what's salvaged above | Delete (kept in backup bundle) |
| `feature/{zalo-order-notifications,first-party-analytics}` | Ancestors of main — fully merged long ago | Delete |
| `feature/{email-campaign-send,discord-order-notifications,page-builder-workflow}`, `worktree-feature+page-builder-task-{02,07,09}…` | All ancestors of fix/pages | Delete |
| `feature/analytics-extensions` (04f49ba) | Only unique commit is a merge of junk-main; all content is in fix/pages | Delete (with no-merges containment check) |
| fix/pages i18n usage | 21 files use translations, only namespaces `home/common/nav/search/info/blog` — all populated. Empty namespaces are unreferenced, so fix/pages is incomplete but **not broken** | Stash salvage completes it |

**Execution location:** the main checkout `/home/khoa1661/Ecommerce-Web` (this plan manages the worktrees themselves, so it cannot run inside one). Run pnpm scripts via `node_modules/.bin/<binary>` directly — `pnpm <script>` fails on this machine until the workspace-yaml fix lands (Task 4).

---

## Task 1: Full safety backup

Nothing may be deleted before this task is committed to disk and verified.

- [ ] **Step 1: Tag the stash and create an all-refs bundle**

```bash
cd /home/khoa1661/Ecommerce-Web
git tag backup/stash-i18n stash@{0}
git bundle create ~/ecommerce-backup-2026-06-12.bundle --all
git bundle verify ~/ecommerce-backup-2026-06-12.bundle
```

Expected: `verify` prints the ref list ending with "is okay". The bundle now contains every branch, the stash commit (via the tag), and all history.

- [ ] **Step 2: Save the main checkout's dirty diff as a patch**

```bash
git diff > ~/main-dirty-2026-06-12.patch
wc -l ~/main-dirty-2026-06-12.patch
```

Expected: non-empty patch (~60 lines). This preserves the import rewrites + navbar fix even after we clean the working tree.

- [ ] **Step 3: Verify backups exist**

```bash
ls -la ~/ecommerce-backup-2026-06-12.bundle ~/main-dirty-2026-06-12.patch
```

Expected: both files present, bundle is several hundred MB or less, patch non-empty. **Do not proceed if either is missing.**

---

## Task 2: Clean the dirty workspaces

- [ ] **Step 1: Discard the main checkout's working-tree changes**

(The valuable part is in the patch from Task 1 and will be re-applied surgically in Task 3.)

```bash
cd /home/khoa1661/Ecommerce-Web
git checkout -- .
git status --porcelain
```

Expected: only the plan file `docs/superpowers/plans/2026-06-12-repo-consolidation.md` (untracked) remains; no ` M ` entries.

- [ ] **Step 2: Abort the stash-apply conflict in the discord worktree**

```bash
git -C .claude/worktrees/discord-order-notifications reset --hard HEAD
git -C .claude/worktrees/discord-order-notifications status --porcelain
```

Expected: empty status. Safe because the stash entry itself still exists (`git stash list` still shows stash@{0}) and is tagged in the bundle.

---

## Task 3: Create the consolidation branch

- [ ] **Step 1: Branch from main and revert the junk commit**

```bash
git checkout -b chore/consolidate-freshest main
git revert --no-edit 5da6252
```

Expected: revert commit created; `git show --stat HEAD` shows the brainstorm tmp files and worktree gitlinks being deleted.

- [ ] **Step 2: Merge the freshest tip**

```bash
git merge --no-ff fix/pages-duplicate-routing-import -m "chore: merge consolidated feature work (analytics, discord, page-builder, i18n)"
```

Expected: **clean merge, zero conflicts** — main's only divergence from fix/pages was the junk commit, whose files don't overlap. If any conflict appears, STOP and re-assess; do not resolve ad hoc.

- [ ] **Step 3: Port the navbar Suspense fix**

In `components/layout/navbar/index.tsx` (~line 88; `Suspense` is already imported), change:

```tsx
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
```

to:

```tsx
            <div className="hidden md:block">
              <Suspense fallback={null}>
                <LanguageSwitcher />
              </Suspense>
            </div>
```

- [ ] **Step 4: Commit the plan doc and navbar fix**

```bash
git add components/layout/navbar/index.tsx docs/superpowers/plans/2026-06-12-repo-consolidation.md
git commit -m "fix(navbar): wrap LanguageSwitcher in Suspense; add consolidation plan"
```

---

## Task 4: Salvage the stashed i18n work (the real conflict resolution)

- [ ] **Step 1: Apply the stash**

```bash
git stash apply stash@{0}
git status --porcelain | grep -c '^UU' || true
```

Expected: applies with ~10–15 `UU` (both-modified) conflicts plus many clean changes. (When it was applied to `feature/integration` it produced 12 conflicts in: about/blog/faq pages, category-section{,-header}, new-arrivals-hero, breadcrumbs, search empty-state, pagination, messages/en.json, messages/vi.json.)

- [ ] **Step 2: Resolve conflicts using this per-file policy**

| File(s) | Resolution |
|---|---|
| `messages/en.json`, `messages/vi.json` | **Union of both sides.** Keep HEAD's populated `nav`/`search`/`home`/`blog`/`info`/`common` keys AND the stash's populated `footer`/`cart`/`product`/`checkout`/`auth`/`profile` namespaces. No namespace may end up `{}` if either side has content for it. |
| `.claude/phases/*` | **Keep HEAD (deleted).** They were intentionally removed by d9730e8; the work they tracked is done. |
| `src/payload/blocks/*.ts`, `src/payload/collections/Pages.ts` | **Keep HEAD.** The stash predates the thumbnail/label/admin-config fixes; its block changes are stale. |
| `pnpm-workspace.yaml` | **Take stash** (replaces `set this to true or false` placeholders with `true`). |
| Components (`variant-selector`, `reviews`, `review-form`, `user-menu`, checkout/profile/cart files, etc.) | **Take the stash's `useTranslations` wiring**, then re-apply HEAD-side hunks where HEAD also changed the file (HEAD changes are 0da9ca7's nav/profile localization and small later fixes — inspect each conflict hunk; combine, don't pick blindly). |

- [ ] **Step 3: Validate the merged catalogs**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/vi.json','utf8')); console.log('valid JSON')"
grep -E '^\s+"(footer|cart|product|checkout|auth|profile)": \{\}' messages/en.json messages/vi.json
```

Expected: `valid JSON`; the grep finds **nothing** (no namespace left empty).

- [ ] **Step 4: Check every referenced namespace exists**

```bash
for f in $(git grep -l "useTranslations\|getTranslations" -- components app | sort -u); do grep -hoE "(useTranslations|getTranslations)\(\s*['\"][a-zA-Z.]+['\"]" "$f" | grep -oE "['\"][a-zA-Z.]+['\"]" ; done | sort -u
```

Expected: every namespace printed exists as a populated top-level key in both `messages/en.json` and `messages/vi.json`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(i18n): complete storefront localization from stashed work

Salvages the uncommitted i18n catalogs and component wiring stashed on
2026-06-08 (footer, cart, product, checkout, auth, profile surfaces) and
fixes the pnpm-workspace allowBuilds placeholders."
```

---

## Task 5: Generate Prisma client and clear type errors

- [ ] **Step 1: Generate the Prisma client**

```bash
node_modules/.bin/prisma generate
```

Expected: client generated into `generated/prisma/` (no DB connection needed).

- [ ] **Step 2: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: **0 errors.** The 21 pre-existing errors were all missing-Prisma-client (`TS2307` in lib/prisma, coupons, gift-cards, payos, campaigns/actions) and their implicit-`any` cascades (checkout/page, carts-data, traffic, reviews, wishlist). If any error survives, fix it minimally (add the explicit parameter type) — but if an error traces to the Task 4 conflict resolution, fix the resolution, not the symptom.

- [ ] **Step 3: Commit (only if fixes were needed)**

```bash
git add -A && git commit -m "fix(types): resolve residual type errors after consolidation"
```

---

## Task 6: Full verification gate

- [ ] **Step 1: Test suite**

```bash
node_modules/.bin/vitest run
```

Expected: all test files pass (≥144 tests; fix/pages baseline was 22 files / 144 green before the i18n salvage).

- [ ] **Step 2: Production build**

```bash
node_modules/.bin/next build 2>&1 | tail -30
```

Expected: build completes. If it fails **only** on missing runtime env (DB connection for Payload prerendering), fall back to a dev-server smoke test:

```bash
node_modules/.bin/next dev --turbo & sleep 25
curl -sf http://localhost:3000/vi >/dev/null && echo "vi OK"
curl -sf http://localhost:3000/en >/dev/null && echo "en OK"
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
kill %1
```

Expected: `vi OK`, `en OK`, admin returns 200/302. **Any code-level failure: STOP — fix before continuing. Do not proceed to Task 7 with a broken build.**

---

## Task 7: Fast-forward main and push

- [ ] **Step 1: Fast-forward main**

```bash
git checkout main
git merge --ff-only chore/consolidate-freshest
git log --oneline -5
```

Expected: fast-forward succeeds (the branch was cut from main, so history is linear). No force anywhere.

- [ ] **Step 2: Push**

```bash
git push origin main
```

Expected: normal push (origin/main is an ancestor — the junk commit was reverted, not removed).

---

## Task 8: Cleanup — delete everything redundant

**Only run after Task 7 succeeded.** The bundle from Task 1 retains all of this permanently.

- [ ] **Step 1: Remove all worktrees**

```bash
cd /home/khoa1661/Ecommerce-Web
for w in discord-order-notifications feature+page-builder-task-02-migration-mappers feature+page-builder-task-07-redirect feature+page-builder-task-09-block-metadata feature+page-builder-workflow; do
  git worktree remove --force ".claude/worktrees/$w"
done
git worktree prune
git worktree list
```

Expected: only the main checkout remains.

- [ ] **Step 2: Containment check, then delete branches**

```bash
for b in feature/analytics-extensions feature/discord-order-notifications feature/email-campaign-send feature/first-party-analytics feature/integration feature/page-builder-workflow feature/zalo-order-notifications fix/pages-duplicate-routing-import worktree-feature+page-builder-task-02-migration-mappers worktree-feature+page-builder-task-07-redirect worktree-feature+page-builder-task-09-block-metadata; do
  n=$(git log --no-merges --oneline main..$b | wc -l)
  echo "$b: $n unique non-merge commits"
done
```

Expected: `0` for every branch. If any branch reports >0, STOP and inspect those commits before deleting that branch. Then:

```bash
git branch -D feature/analytics-extensions feature/discord-order-notifications feature/email-campaign-send feature/first-party-analytics feature/integration feature/page-builder-workflow feature/zalo-order-notifications fix/pages-duplicate-routing-import worktree-feature+page-builder-task-02-migration-mappers worktree-feature+page-builder-task-07-redirect worktree-feature+page-builder-task-09-block-metadata freshmain freshmain2 chore/consolidate-freshest
```

(`freshmain`/`freshmain2` are snapshot commits — verified to contain nothing not already salvaged; they live on in the bundle. `-D` is required because merge-only/snapshot commits aren't ancestors.)

- [ ] **Step 3: Drop the stash and the backup tag**

```bash
git stash drop stash@{0}
git tag -d backup/stash-i18n
```

(Both remain recoverable from the bundle.)

- [ ] **Step 4: Final state check**

```bash
git branch -a && git stash list && git status --porcelain && git worktree list
```

Expected: only `main` + `remotes/origin/main`, empty stash, clean status, one worktree. Keep `~/ecommerce-backup-2026-06-12.bundle` indefinitely.

- [ ] **Step 5: Log the decision**

Append to `DECISIONS.md` (create if missing):

```markdown
## 2026-06-12 — Consolidate all branches into main from fix/pages tip
**Chosen:** `fix/pages-duplicate-routing-import` as the consolidation base; salvaged stashed i18n catalogs, navbar Suspense fix, and pnpm-workspace fix; deleted 14 branches, 5 worktrees, and the stash after verification.
**Alternatives:** Merging `feature/integration` (rejected: superseded, more type errors); keeping branches around (rejected: user wants a clean repo; full bundle backup retained at ~/ecommerce-backup-2026-06-12.bundle).
**Why:** fix/pages already contained every PR merge; integration's lone fix existed there in newer form; the stash held ~300 lines of never-committed i18n work.
**Trade-offs:** History keeps PR merge commits and a junk-commit revert; deleted branches recoverable only from the bundle.
**Revisit if:** Any storefront surface shows raw i18n keys — check the Task 4 catalog union first.
```

```bash
git add DECISIONS.md && git commit -m "docs: log branch consolidation decision" && git push origin main
```

---

## Self-Review Notes

- **No-loss guarantee:** Task 1 bundles every ref + stash before anything is touched; the dirty diff is saved as a patch; deletions happen only in Task 8 after main is pushed and verified.
- **Conflict scope:** the only expected conflicts are the stash apply (Task 4, policy table provided) — the main merge (Task 3) is conflict-free by construction.
- **"Nothing breaking":** gated by Task 5 (0 type errors), Task 6 (full tests + build/smoke), and the Task 4 namespace checks; Task 8's containment loop prevents deleting unmerged commits.
