# UX Round 3 — Phase 5: Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear up the remaining lower-severity rough edges — indistinct status colors, no address edit, a doubled result count, a weak registration password flow, an unexplained disabled review button, and lazy above-the-fold hero images.

**Architecture:** Six small, independent fixes. One adds a Prisma-backed `updateAddressAction` mirroring the existing create action; the rest are targeted UI/markup changes. Two carry logic worth a Vitest test (none strictly required — kept minimal).

**Tech Stack:** Next.js 15, React 19, Prisma (`userAddress`), next-intl, next/image, Tailwind, Vitest.

## Global Constraints

- **Do not break CMS / page-builder preview.** Task 6 edits the `Hero` block component (`components/blocks/Hero.tsx`), which renders in both the storefront and the page-builder preview. The change (adding `priority` to an `<Image>`) is provider-independent and preview-safe; still confirm the preview renders after Task 6.
- **New user-facing copy is translated** in BOTH message files — EXCEPT `updateAddressAction`, which reuses the exact error strings of the existing `createAddressAction` to stay consistent with that file (which is uniformly untranslated; see Task 2 note). Following the established pattern beats introducing one lone translated action.
- **Address writes use Prisma `userAddress`** (not a Payload relationship), so the numeric-id relationship constraint does not apply here.
- **Vitest test files MUST import `describe/expect/it` from `vitest`.**
- **Conventional Commits**, atomic. Commit directly to `main`.

---

## File Structure

- `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx` — MODIFY: distinct status colors (Task 1).
- `app/[locale]/(storefront)/profile/actions.ts` — MODIFY: add `updateAddressAction` (Task 2).
- `app/[locale]/(storefront)/profile/addresses-panel.tsx` — MODIFY: edit UI (Task 2).
- `app/[locale]/(storefront)/search/page.tsx` — MODIFY: de-duplicate result count (Task 3).
- `components/auth-form.tsx` — MODIFY: confirm-password + rule (Task 4).
- `components/product/review-form.tsx` — MODIFY: rating hint (Task 5).
- `components/blocks/Hero.tsx` — MODIFY: `priority` on above-fold tiles (Task 6).
- `messages/en.json`, `messages/vi.json` — MODIFY (Tasks 4, 5).

---

## Task 1: Distinct status-pill colors for pending vs delivered (finding 5.1)

`profile/orders/[orderCode]/page.tsx:124-130` — the status pill's two non-cancelled ternary branches both resolve to `bg-emerald-100 text-emerald-800 ...`, so a still-pending order looks "complete" at a glance. Fix: give non-delivered/non-cancelled states a neutral/amber color.

**Files:**
- Modify: `app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx`

**Interfaces:** none.

- [ ] **Step 1: Split the color branches**

Replace the pill `className` ternary (lines 123–131) so only `delivered` is green:

```tsx
<span
  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
    isCancelled
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
      : order.orderStatus === 'delivered'
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
        : order.orderStatus === 'shipped'
          ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
  }`}
>
```

(Delivered = green, shipped = blue, everything else pending = amber, cancelled = rose. Match the project's Tailwind color scale — `sky`/`amber` are standard.)

- [ ] **Step 2: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Manual verification**

View a pending order and a delivered order detail page → the pills are visibly different colors (amber vs green).

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(storefront)/profile/orders/[orderCode]/page.tsx"
git commit -m "fix(orders): use distinct status-pill colors per stage"
```

---

## Task 2: Add an address edit path (finding 5.2)

`profile/actions.ts` exports only `createAddressAction`, `deleteAddressAction`, `setDefaultAddressAction`. Fixing a typo means delete-and-retype (losing default status). Add `updateAddressAction` mirroring the create action, and an edit affordance in the panel.

**Files:**
- Modify: `app/[locale]/(storefront)/profile/actions.ts` (add `updateAddressAction`)
- Modify: `app/[locale]/(storefront)/profile/addresses-panel.tsx` (edit UI)

**Interfaces:**
- Produces: `updateAddressAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }>` — reads an `addressId` field plus the same fields as create; updates the row scoped to the current user.

**Note:** The error strings below are Vietnamese, copied verbatim from `createAddressAction` (lines 90–140). `profile/actions.ts` is uniformly untranslated; translating the whole file is a separate follow-up (not in this round's enumerated i18n scope). Matching the neighbor keeps the file consistent (existing-code rule).

- [ ] **Step 1: Add `updateAddressAction`**

Insert after `createAddressAction` (after line 146) in `profile/actions.ts`:

```typescript
export async function updateAddressAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }

  const addressId = trimString(formData.get('addressId'), 64);
  if (!addressId) return { ok: false, error: 'Địa chỉ không hợp lệ.' };

  const title = trimString(formData.get('title'), MAX_TITLE);
  const fullName = trimString(formData.get('fullName'), MAX_NAME);
  const phone = trimString(formData.get('phone'), MAX_PHONE);
  const addressLine = trimString(formData.get('addressLine'), MAX_TEXT);
  const city = trimString(formData.get('city'), MAX_TEXT);
  const ward = optionalString(formData.get('ward'), MAX_TEXT);
  const district = optionalString(formData.get('district'), MAX_TEXT);
  const country = trimString(formData.get('country'), MAX_TEXT) || 'Vietnam';
  const isDefault = formData.get('isDefault') === 'on' || formData.get('isDefault') === 'true';

  if (!title) return { ok: false, error: 'Vui lòng nhập nhãn địa chỉ.' };
  if (!fullName) return { ok: false, error: 'Vui lòng nhập tên người nhận.' };
  if (!phone) return { ok: false, error: 'Vui lòng nhập số điện thoại.' };
  if (!addressLine) return { ok: false, error: 'Vui lòng nhập địa chỉ.' };
  if (!city) return { ok: false, error: 'Vui lòng nhập tỉnh / thành phố.' };

  try {
    await prisma.$transaction(async (tx) => {
      // Ownership check: scope the update to this user's rows.
      const owned = await tx.userAddress.findFirst({
        where: { id: addressId, userId: session.user.id },
        select: { id: true },
      });
      if (!owned) throw new Error('NOT_FOUND');

      if (isDefault) {
        await tx.userAddress.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      await tx.userAddress.update({
        where: { id: addressId },
        data: { title, fullName, phone, addressLine, ward, district, city, country, isDefault },
      });
    });
  } catch (error) {
    logger.error({ err: error }, '[profile.updateAddressAction] failed');
    return { ok: false, error: 'Không thể lưu địa chỉ.' };
  }

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { ok: true };
}
```

(Confirm `trimString`, `optionalString`, `MAX_*`, `prisma`, `logger`, `revalidatePath`, and the `ActionResult` type are already imported/defined in the file — they are, since `createAddressAction` uses them.)

- [ ] **Step 2: Wire the edit UI in `addresses-panel.tsx`**

Read the panel first (`app/[locale]/(storefront)/profile/addresses-panel.tsx`) to match its create-form markup. Add an "Edit" button per address row that opens the same form the create flow uses, pre-filled with that address's values (`defaultValue`), plus a hidden `addressId` field, and submits to `updateAddressAction` instead of `createAddressAction`. Reuse the existing field components and validation-toast handling — do not build a second form style. Keep create and edit visually identical (edit = pre-filled create form with a different action + submit label).

- [ ] **Step 3: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Manual verification**

Edit a saved address's street line → save → the row reflects the new value; its default status is preserved unless the default checkbox was changed; other addresses are untouched. Editing an address you do not own (tampered `addressId`) returns the "không hợp lệ / không thể lưu" error (the ownership check throws).

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(storefront)/profile/actions.ts" "app/[locale]/(storefront)/profile/addresses-panel.tsx"
git commit -m "feat(profile): allow editing a saved address"
```

---

## Task 3: De-duplicate the search result count (finding 5.3)

`search/page.tsx:94` builds the `<h1>` as `t('resultsCount', { count }) + " \"query\""`, and `:100-103` repeats the identical `resultsCount` phrase in the paragraph below — the shopper sees "12 results for "keychain"" twice, stacked. Fix: keep the count in the `<h1>` and drop the redundant paragraph (or vice versa). Keep the `<h1>` (it is the page heading) and replace the paragraph's duplicated content.

**Files:**
- Modify: `app/[locale]/(storefront)/search/page.tsx`

**Interfaces:** none.

- [ ] **Step 1: Remove the duplicated count paragraph**

The `<h1>` (line 93) already shows `t('resultsCount', { count }) + " \"query\""` for a query, or `t('allProducts')` otherwise. Remove the redundant `<p>` block (lines 99–110) that re-renders `resultsCount`/`productCount` for the query case. For the no-query case the `<h1>` shows `allProducts` (no count), so keep a single count line there:

Replace the whole `{filtered.length > 0 ? (<p>...</p>) : null}` block with:

```tsx
{filtered.length > 0 && !trimmedQuery ? (
  <p className="mb-5 text-sm text-warm-500 dark:text-warm-400">
    {t('productCount', { count: filtered.length })}
  </p>
) : null}
```

(Now: a query shows the count once in the `<h1>`; browsing with no query shows "N products" once below the "All products" heading. No phrase is doubled.)

- [ ] **Step 2: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Manual verification**

`/vi/search?q=keychain` → the "N kết quả cho "keychain"" phrase appears exactly once. `/vi/search` (no query) → "All products" heading + a single "N products" line.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(storefront)/search/page.tsx"
git commit -m "fix(search): stop printing the result count twice"
```

---

## Task 4: Confirm-password and a stated rule on registration (finding 5.4)

`components/auth-form.tsx:145-154` has a single password input with `minLength={8}` and no confirmation, so a typo'd password silently locks the new account out. Fix (register mode only): add a confirm-password field and a visible password-rule hint; block submit on mismatch.

**Files:**
- Modify: `components/auth-form.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (`auth.confirmPasswordLabel`, `auth.passwordRule`, `auth.passwordMismatch`)

**Interfaces:** none.

**Key table** (namespace `auth` — confirm the exact namespace the form's `useTranslations` uses; the form already calls `t('passwordLabel')`):

| key | VI | EN |
|-----|-----|-----|
| `confirmPasswordLabel` | Xác nhận mật khẩu | Confirm password |
| `passwordRule` | Tối thiểu 8 ký tự. | At least 8 characters. |
| `passwordMismatch` | Mật khẩu nhập lại không khớp. | Passwords do not match. |

- [ ] **Step 1: Add the keys** to both message files under the form's namespace.

- [ ] **Step 2: Add confirm-password state (register only)**

Near the existing `const [password, setPassword] = useState('');` (line 19) add:

```typescript
const [confirmPassword, setConfirmPassword] = useState('');
```

- [ ] **Step 3: Render the rule hint and confirm field**

Below the existing password input (after line 154's field block), add — gated on `isRegister`:

```tsx
{isRegister ? (
  <>
    <p className="mt-1 text-xs text-warm-500 dark:text-warm-400">{t('passwordRule')}</p>
    <div className="mt-4">
      <label htmlFor="confirmPassword" className="...">{t('confirmPasswordLabel')}</label>
      <input
        id="confirmPassword"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="..." /* match the existing password input classes */
      />
    </div>
  </>
) : null}
```

- [ ] **Step 4: Block submit on mismatch**

In the register submit handler (before the `fetch('/api/register'...)` at line ~30), add:

```typescript
if (isRegister && password !== confirmPassword) {
  setError(t('passwordMismatch')); // use the form's existing error state/setter
  return;
}
```

(Match the component's existing error-display mechanism — find how login/register errors are shown and reuse it.)

- [ ] **Step 5: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 6: Manual verification**

On `/vi/login` register mode: a rule hint shows under the password; mismatched passwords block submit with a clear message; matching passwords register normally.

- [ ] **Step 7: Commit**

```bash
git add components/auth-form.tsx messages/en.json messages/vi.json
git commit -m "fix(auth): add confirm-password and a password rule to registration"
```

---

## Task 5: Explain the disabled review submit (finding 5.5)

`components/product/review-form.tsx:106` disables the submit button while `rating === 0` with no hint tying it to the star widget, so a shopper who wrote a review presses a greyed-out button and doesn't know a star is required. Fix: show a helper line when no rating is selected.

**Files:**
- Modify: `components/product/review-form.tsx`
- Modify: `messages/en.json`, `messages/vi.json` (`product.reviewNeedsRating`)

**Interfaces:** none.

- [ ] **Step 1: Add the copy**

`messages/en.json` under `product`: `"reviewNeedsRating": "Select a star rating to post your review."`
`messages/vi.json` under `product`: `"reviewNeedsRating": "Chọn số sao để đăng đánh giá."`

- [ ] **Step 2: Render the hint when no rating is chosen**

Just above the submit button (before the `<button type="submit" ...>` at line 104), add:

```tsx
{rating === 0 ? (
  <p className="mt-4 text-xs text-warm-500 dark:text-warm-400">{t('reviewNeedsRating')}</p>
) : null}
```

(The form already has `const t = useTranslations('product')` — it uses `t('reviewSubmit')` etc.)

- [ ] **Step 3: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Manual verification**

On a product's review form with no star selected, the hint shows and the button is disabled; selecting a star hides the hint and enables the button.

- [ ] **Step 5: Commit**

```bash
git add components/product/review-form.tsx messages/en.json messages/vi.json
git commit -m "fix(reviews): explain that a star rating is required to submit"
```

---

## Task 6: Prioritize above-the-fold hero images (auditor-found LCP)

The homepage `Hero` block's 2×2 collage tiles (`components/blocks/Hero.tsx:257-263`) render `<Image>` with no `priority`, so `loading="lazy"` is emitted for images that are above the fold on load (confirmed on the deployed home HTML: the first `<img alt="Aircraft kits">` is lazy). This defers the LCP paint. Fix: mark the first-row tiles `priority`.

**Files:**
- Modify: `components/blocks/Hero.tsx`

**Interfaces:** none.

- [ ] **Step 1: Add `priority` to the first-row collage tiles**

In the `tiles.map((t, i) => ...)` block, add `priority` to the tile `<Image>` (line 257) for the first row of the 2×2 grid:

```tsx
<Image
  src={t.url}
  alt={t.label}
  fill
  className="object-cover"
  sizes="(max-width: 1024px) 50vw, 25vw"
  priority={i < 2}
/>
```

(Only the first two tiles — the visible top row — get `priority`; the rest stay lazy. The single-image fallback at line 234 already has `priority`.)

- [ ] **Step 2: Typecheck** — `./node_modules/.bin/tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Verify against the deployed build (after deploy)**

Re-probe the homepage HTML and confirm the first hero tile image is no longer `loading="lazy"`:

```bash
curl -s http://116.118.6.30:3000/vi | grep -oE '<img[^>]*alt="[^"]*"[^>]*loading="[a-z]*"' | head -4
```

Expected: the first collage image carries `fetchpriority="high"` (or no `loading="lazy"`) rather than `loading="lazy"`. (This reflects the change only after the image is rebuilt and redeployed.)

- [ ] **Step 4: CMS-preview sanity check**

Load a page-builder preview that includes a Hero block; confirm it still renders (the `priority` prop is preview-safe).

- [ ] **Step 5: Commit**

```bash
git add components/blocks/Hero.tsx
git commit -m "perf(home): prioritize above-the-fold hero collage images"
```

---

## Final verification

- [ ] `./node_modules/.bin/vitest run`
- [ ] `./node_modules/.bin/tsc --noEmit`
- [ ] JSON validity + key parity (see Phase 3 final-verification commands).
- [ ] Deployed manual pass: distinct status colors; address edit works and is ownership-scoped; single result count; register confirm-password + rule; review rating hint; hero first image not lazy.

## Self-review notes

- **Spec coverage:** 5.1 (Task 1), 5.2 (Task 2), 5.3 (Task 3), 5.4 (Task 4), 5.5 (Task 5), 5.6/LCP (Task 6). All Phase-5 findings covered.
- **Intentional pattern-match:** `updateAddressAction` keeps the VN error strings of its neighbor rather than translating one action in isolation; flagged in Global Constraints and Task 2.
- **CMS constraint:** Task 6 touches the `Hero` block (preview-rendered); the change is provider-independent and re-verified in Task 6 Step 4.
