# Email Verification System — Design

**Date:** 2026-07-14
**Status:** Approved (pending spec review)
**Area:** Auth (NextAuth Credentials), checkout

## Goal

Require a verified email before checkout. Concretely:

- Credentials-based accounts must verify their email (via a link) before they can complete checkout.
- Google OAuth accounts are auto-verified on first sign-in (Google already confirmed the address).
- Login itself is **not** gated on verification — only checkout is.
- Guest checkout is removed: checkout requires being logged in, and requires `emailVerified` to be set.

Out of scope: phone/SMS verification (bigger effort — no SMS provider, no `User.phone` field, added cost; a candidate for a separate future project if still wanted after this ships).

## Background

- `User.emailVerified` (`prisma/schema.prisma`, `DateTime?`) already exists (standard NextAuth Adapter field) but is currently written nowhere and read nowhere.
- `VerificationToken` (`identifier`, `token`, `expires`, `@@unique([identifier, token])`) already exists and is currently used only by password reset (`app/api/auth/forgot-password/route.ts`), keyed on `identifier = email`.
- `lib/email/client.ts` has a working Resend-backed **bulk** sender (`sendBulkEmail`), gated on `RESEND_API_KEY` + `EMAIL_FROM` both being set; used today only by the campaigns feature.
- Password-reset email delivery is currently a known gap: in production, `forgot-password/route.ts` never sends an email — it only logs a warning that no email provider is configured, and dev builds log the reset URL to the console instead of sending it. Nobody has ever actually received a reset email in production. Fixed as a side effect of this work (see below).
- `app/api/checkout/route.ts` and `checkout/page.tsx` currently support guest checkout: `userId` can be `null`, falling back to a `customerInfo.email` supplied in the request body.

## Data model

No schema migration required.

- `User.emailVerified` becomes the single source of truth for verification status.
- `VerificationToken` is reused, namespaced by convention (no schema change) so verification tokens never collide with password-reset tokens sharing the same table:
  - Password reset: `identifier = email`
  - Email verification: `identifier = "verify-email:" + email`

## Flows

### 1. Registration (`app/api/register/route.ts`)

After creating the Prisma user:
1. Delete any existing verification tokens for `"verify-email:" + email` (mirrors the existing forgot-password `deleteMany` pattern).
2. Generate a token: `randomBytes(32).toString('hex')`, TTL 24h (longer than password reset's 1h — no urgency driving a short window here).
3. Store the `VerificationToken` row.
4. Send a verification email containing a link to `${absoluteUrl}/verify-email?token=...`.
5. Email failures never block registration — the account is created regardless; verification can always be resent. Matches the existing "email is best-effort" convention from campaigns.

### 2. Single-recipient email sending (`lib/email/send.ts`, new)

A `sendEmail({ to, subject, text, html })` function alongside the existing `sendBulkEmail` in `lib/email/client.ts`. Same `getEmailConfig()` gating (`RESEND_API_KEY` + `EMAIL_FROM`); same "log and no-op when unconfigured" behavior as the existing bulk path. Used by:
- The new registration verification email.
- `forgot-password/route.ts`, replacing its current no-op/console-log placeholder — this finally wires up real password-reset email delivery.

### 3. Verify page (`app/[locale]/(storefront)/verify-email/page.tsx`, new)

Mirrors the existing `reset-password` page's structure. Server component:
1. Reads `token` from search params.
2. Looks up the `VerificationToken` by `token`.
3. If missing or `expires < now`: render an "expired/invalid — request a new link" state (with an email input feeding the resend endpoint).
4. If valid: extract the email from `identifier` (strip the `"verify-email:"` prefix), set `User.emailVerified = new Date()` for that email, delete the token (one-time use), render a success state with a link to continue (to `/login` if not currently authenticated, or `/checkout` if there's an active session for that email).

Works regardless of whether the visitor is currently logged in — verifying from a different device/tab than the one that registered must work.

### 4. Resend verification (`POST /api/auth/resend-verification`, new)

Body: `{ email }`. Enumeration-safe, matching `forgot-password`'s existing convention: always responds `{ ok: true }`. Internally: only looks up and re-sends if the account exists and `emailVerified` is still null (already-verified accounts get no email, but the response is identical either way). Added to the existing rate-limited auth-route group in `middleware.ts` (5/min per IP).

### 5. Google OAuth auto-verify (`auth.ts`)

In the `signIn` callback, when `account?.provider === 'google'` and the user's `emailVerified` is not already set, update it to `now()`. Runs on the sign-in event, not on every request, so it doesn't add DB load to normal session refreshes.

### 6. Checkout gate

Enforced in both the page (UX) and the API (authorization boundary) — the API must not trust the page.

- `checkout/page.tsx`: no session → `redirect('/login?callbackUrl=/checkout')` (same pattern as `profile/page.tsx`). Session present but `emailVerified` is null → render a "verify your email to continue" screen (with a resend button hitting the endpoint from §4) instead of the checkout form.
- `app/api/checkout/route.ts`: no `userId` → `401`. `userId` present but the user's `emailVerified` is null → `403`. This removes the existing guest-checkout fallback (`buyerEmail` from `customerInfo.email` when `userId` is null).

`emailVerified` is read fresh from Prisma at checkout time (not threaded through the JWT/session), so a verification completed in another tab is picked up immediately without needing a session refresh.

## Error handling & edge cases

- Enumeration safety on resend: identical response whether or not the account exists (matches forgot-password).
- Email send failures are logged and swallowed at the call site — they never surface as a user-facing 500 or block account creation.
- An expired or already-consumed token on the verify page shows a distinct "request a new link" state rather than a generic error.
- Because the checkout API gate is the actual authorization boundary, a request that bypasses the UI (e.g. a direct API call) still gets rejected correctly.

## Testing

Vitest, following the existing `lib/__tests__/` conventions:

- Token generation & namespacing (verification tokens never collide with password-reset tokens for the same email).
- Verify-page logic: valid token, expired token, already-consumed token, invalid/missing token.
- Resend endpoint: enumeration safety (existing vs. non-existing email), no-op when already verified, rate limiting.
- Google auto-verify: `emailVerified` set on first Google sign-in, left untouched on subsequent sign-ins if already set.
- Checkout gate: page redirect when logged out, blocking screen when unverified, `401`/`403` from the API route in the same two cases, success when verified.
