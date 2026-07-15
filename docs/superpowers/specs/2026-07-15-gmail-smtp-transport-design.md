# Gmail SMTP Email Transport — Design

**Date:** 2026-07-15
**Status:** Approved (pending spec review)
**Area:** Email delivery (`lib/email/`), verification + password reset + campaigns
**Follows:** `docs/superpowers/specs/2026-07-14-email-verification-design.md`

## Goal

Make the app actually deliver email, by replacing the Resend HTTP transport
behind `sendEmail()` / `sendBulkEmail()` with Gmail SMTP authenticated by a
Google App Password.

**No behavior outside `lib/email/` changes.** Both functions keep their exact
current signatures and their "log and no-op when unconfigured" contract.

## Background — read this before touching code

The email verification feature (registration → link → `emailVerified`) was
built on 2026-07-14 per the spec linked above and is **complete and correct**.
Nothing in that flow needs fixing. The observed bug — "buying with an
unverified account forces verification, but no email ever arrives" — has a
single cause:

`lib/email/send.ts:27` gates on `getEmailConfig().configured`, which requires
`RESEND_API_KEY` and `EMAIL_FROM`. **Neither is set in `.env`, `.env.example`,
`docker-compose.yml`, or `Dockerfile.private`.** So `sendEmail()` logs
`'[email] not configured — skipping send'` and returns without a network call.
The verification token is still minted and stored; it simply never reaches the
user. The feature has never been switched on.

The full path, for orientation:

| Step | Location |
|---|---|
| Checkout rejects unverified users (403) | `lib/checkout-auth.ts:18` |
| Resend endpoint (always returns `ok: true`) | `app/api/auth/resend-verification/route.ts:34` |
| Registration issues a token | `app/api/register/route.ts:62` |
| Token minted + link built + send attempted | `lib/email-verification.ts:31` |
| **Send silently no-ops here** | `lib/email/send.ts:27` |
| Link consumed, `emailVerified` set | `lib/email-verification.ts:61` |
| Verify page | `app/[locale]/(storefront)/verify-email/page.tsx` |

Everything above and below the send step works. Only the transport is missing.

## Why Gmail SMTP and not the Gmail API

The user initially asked for "a Google API". The Gmail API was rejected:

- `gmail.send` is a **restricted** OAuth scope. While the Google Cloud consent
  screen is in Testing mode, refresh tokens **expire after 7 days** — the shop
  would silently stop sending every week. Escaping Testing mode requires Google
  verification and can trigger a paid third-party security assessment.
- It would need a separate one-time OAuth flow to mint a refresh token for the
  shop's *own* account. The existing `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
  authenticate *customers* via NextAuth; they grant the server no sending
  rights.

Gmail SMTP + App Password reaches the same outcome (Google sends the mail from
the shop's Gmail account) with no scopes, no consent screen, no expiring
tokens, and no review. Cost: a ~500 recipients/day cap on free Gmail (2,000 on
Workspace), and the sender is a gmail.com address rather than the shop domain.

Resend was not chosen because it requires a domain the user owns and can
verify; without one it only delivers to the account holder's own address. If a
domain is acquired later, swapping back is contained — everything routes
through `sendEmail()` / `sendBulkEmail()`.

## Configuration

`getEmailConfig()` in `lib/email/client.ts:26` currently reads
`RESEND_API_KEY` + `EMAIL_FROM`. It changes to:

| Env var | Required | Purpose |
|---|---|---|
| `GMAIL_USER` | yes | Full Gmail address. SMTP username and default sender. |
| `GMAIL_APP_PASSWORD` | yes | 16-char App Password from `myaccount.google.com/apppasswords`. **Not** the account password. |
| `EMAIL_FROM` | no | Display sender, e.g. `Lô Hobby <shop@gmail.com>`. Falls back to `GMAIL_USER`. |

`configured` becomes `Boolean(GMAIL_USER && GMAIL_APP_PASSWORD)`.

The `EmailConfig` interface changes shape (`apiKey: string` → `user: string`
and `appPassword: string`; `from` stays). The only consumer outside
`lib/email/` is `app/(payload)/admin/campaigns/actions.ts:65`, which reads
`.configured` only — so it needs **no structural change**. It does need a copy
fix: line 66 renders the user-facing string
`'Email chưa cấu hình (đặt RESEND_API_KEY) — chưa gửi.'`, which names the wrong
env var once this lands. Update it to reference `GMAIL_APP_PASSWORD`.

App Passwords require 2-Step Verification enabled on the Google account. That
is a manual user step; Gmail rejects plain SMTP auth without it.

## Implementation

**Dependency:** add `nodemailer` and `@types/nodemailer`. Hand-rolling SMTP is
not worth it. Note this repo's pnpm quirk: `pnpm <script>` can fail via
`runDepsStatusCheck` — call `node_modules/.bin/*` binaries directly.

**Transport:** one lazily-created, module-level nodemailer transporter against
`smtp.gmail.com:587` (STARTTLS, `secure: false`), reused across sends. Do not
build a transporter per email — it is slow and burns connections. Both
`sendEmail()` and `sendBulkEmail()` share it.

**`sendEmail()` (`lib/email/send.ts`):** unchanged signature
`({ to, subject, text, html }) => Promise<{ configured, sent }>`. Unconfigured
→ log and return `{ configured: false, sent: false }`. Send errors are caught,
logged via `logger.warn`, and returned as `{ configured: true, sent: false }` —
never thrown.

**`sendBulkEmail()` (`lib/email/client.ts`):** unchanged signature
`({ subject, text, html, recipients }) => Promise<{ configured, sent, failed }>`.

SMTP has no batch equivalent to Resend's 100-per-request endpoint, so the
`chunk()` helper and `BATCH_LIMIT` go away and this becomes a sequential loop
over recipients on the pooled connection, tallying `sent` / `failed`
per-recipient. One recipient per message (never a shared To/BCC) — preserve
this, it is what keeps addresses from leaking between customers. Per-recipient
failures are tallied, never thrown.

**Known constraint, do not paper over:** Gmail caps ~500 recipients/day and
will temporarily lock the account if exceeded. Irrelevant for verification and
password-reset volume; a real ceiling for campaigns. This is the constraint
that will eventually force a move to Resend + a domain.

## Out of scope — do not bundle these in

- **The silent-success problem.** `/api/auth/resend-verification` returns
  `ok: true` even when nothing was sent; `issueVerificationEmail` discards
  `sendEmail`'s `{ configured: false }` result. This is what hid the bug from
  the user for a day. It is a real fix but a **separate concern from the
  transport** — do it as its own commit afterward if requested. The
  enumeration-safe response for *unknown* accounts must stay as-is
  (`route.ts:25` reasoning is sound); only the unconfigured-operator case is
  worth surfacing.
- Any change to token issuance, the verify page, `consumeVerificationToken`,
  the checkout gate, or Google auto-verify. All work today.

## Deployment note

`lib/email-verification.ts:39` builds the verification link via `absoluteUrl()`
(`lib/utils.ts:37`), which resolves from `APP_URL` at module load. `.env` has
`NEXT_PUBLIC_APP_URL="http://localhost:3000"`, so **links minted in production
point at localhost unless `APP_URL` is set per-host.** This matches the
existing deployment convention (`APP_URL` is deliberately runtime, not
`NEXT_PUBLIC_`, so one image serves any domain) but it will break the first
real send if missed.

## Testing

Vitest (`node_modules/.bin/vitest run`), following `lib/__tests__/`
conventions. Test files must import `describe`/`it`/`expect` from `vitest`
explicitly — `globals: true` is runtime-only and `tsc --noEmit` breaks without
the import.

`lib/__tests__/email-send.test.ts` and `lib/__tests__/email-client.test.ts`
currently mock `fetch` and assert Resend's JSON payload shape. Rewrite them to
mock the nodemailer transporter and assert the same **behavioral** contract —
the coverage should stay equivalent, only the transport being asserted changes:

- `getEmailConfig()`: unconfigured when either var is missing; configured when both set.
- `sendEmail()`: no-op without touching the transport when unconfigured; `sent: true` on success; `sent: false` (not thrown) when the transport rejects.
- `sendBulkEmail()`: `sent`/`failed` tallies; one message per recipient (no shared To/BCC); a rejection for one recipient does not abort the rest.

## Documentation

- Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM` to `.env.example`,
  `docker-compose.yml`, and `Dockerfile.private`, with a comment pointing at
  `myaccount.google.com/apppasswords` and noting 2FA is a prerequisite.
- **`.env`, `docker-compose.yml`, and `Dockerfile.private` are gitignored and
  contain live secrets — edit them locally but NEVER `git add` them.** Only
  `.env.example` is tracked, and it takes placeholder values only. A real App
  Password in a commit is a credential leak requiring rotation.
- Log a `DECISIONS.md` entry: Gmail SMTP chosen over Gmail API (restricted
  scope, 7-day token expiry) and over Resend (no domain yet); trade-off is the
  500/day cap and gmail.com sender; revisit when a domain is acquired or
  campaign volume approaches the cap.

## Acceptance

Registering a new account, or hitting resend from the checkout verification
screen, delivers a real email to the recipient's inbox; clicking the link sets
`emailVerified` and checkout proceeds. Verified by an actual send, not only by
tests passing.
