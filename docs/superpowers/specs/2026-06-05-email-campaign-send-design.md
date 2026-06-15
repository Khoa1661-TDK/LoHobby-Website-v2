# Email Campaign Send — Design

Date: 2026-06-05
Status: Approved
Branch: `feature/email-campaign-send`

## Goal

Finish `sendCampaignToNewsletterAction`, currently a stub that marks a campaign
`SENT` without delivering any email. Replace the stub with a real, production-ready
send path that is **credential-agnostic**: it stays inert until `RESEND_API_KEY` and
`EMAIL_FROM` are set, but the full code path is exercised once they are.

This is Phase-3 email work, separate from the active I18N-PHASE-02. No i18n files are touched.

## Context / Existing Pattern

The send path mirrors the recently-added Zalo notifier:

- `lib/zalo/oa-client.ts` — thin, config-gated client using raw `fetch` (no SDK dep),
  silently no-ops when not configured.
- `lib/zalo/order-notification.ts` — pure message builder + a `notify*` orchestrator.
- Tests in `lib/__tests__/`.

We follow the same conventions: raw `fetch` against the ESP HTTP API, **no new
dependency**, inert-when-unconfigured, logic in `lib/` (testable) with a thin
`'use server'` orchestrator.

ESP: **Resend**, via its `/emails/batch` endpoint. Chosen over the official SDK
(adds an unverifiable dependency; conflicts with the no-SDK Zalo convention; pnpm
`ignored-builds` friction) and over generic SMTP/nodemailer (heavier, more env vars,
bulk-send deliverability risk).

## Components

### `lib/email/client.ts` (new)

```ts
export interface EmailConfig { configured: boolean; apiKey: string; from: string }
export function getEmailConfig(): EmailConfig
export interface SendBulkResult { configured: boolean; sent: number; failed: number }
export async function sendBulkEmail(args: {
  from: string;
  subject: string;
  text: string;
  html: string;
  recipients: string[];
}): Promise<SendBulkResult>
```

- `getEmailConfig()` reads `RESEND_API_KEY` and `EMAIL_FROM` from `process.env`.
  `configured` is `false` when either is empty/missing.
- `sendBulkEmail`:
  - If not configured → returns `{ configured: false, sent: 0, failed: 0 }` and logs
    intent (parity with the current stub log). Never throws.
  - Chunks `recipients` into batches of **100** (Resend batch limit).
  - Each chunk → one POST to `https://api.resend.com/emails/batch` with
    `Authorization: Bearer <apiKey>`. The payload is an array of per-recipient email
    objects (`to: [oneAddress]`) — one email per subscriber, so no address is exposed
    to other subscribers.
  - HTTP non-2xx or thrown network errors are caught **per chunk**; that chunk's
    recipients are counted as `failed`. Successful chunks add to `sent`.
  - Returns the aggregate `{ configured: true, sent, failed }`.

### `lib/email/render.ts` (new)

```ts
export function renderCampaignBody(body: string): { text: string; html: string }
```

Pure function. `text` = the raw body. `html` = HTML-escaped body with `\n` converted
to `<br>`. Isolated and unit-tested.

### `sendCampaignToNewsletterAction` rewrite — `app/(payload)/admin/campaigns/actions.ts`

Guard order:

1. `isEmailCampaignsEnabled()` flag + `requireAdmin()` (unchanged).
2. Load campaign by id; reject if missing; reject if already `SENT` (unchanged).
3. `getEmailConfig()` — if not configured → return
   `{ ok: false, message: 'Email chưa cấu hình (đặt RESEND_API_KEY) — chưa gửi.' }`.
   Campaign stays `DRAFT`.
4. Load subscriber emails (`prisma.newsletterSubscriber.findMany`, select `email`).
   If zero → return `{ ok: false, message: 'Chưa có người đăng ký.' }`. Stays `DRAFT`.
5. `renderCampaignBody(campaign.body)` → `sendBulkEmail({ from, subject, text, html, recipients })`.
6. If `sent === 0` (every recipient failed) → stay `DRAFT`, return
   `{ ok: false, message: 'Gửi thất bại…' }`.
7. Otherwise update `status = SENT`, `sentAt = new Date()`, `recipientCount = sent`;
   `revalidatePath('/admin/campaigns')`; return `{ ok: true }`.

The action stays a thin orchestrator — all real logic is in `lib/email/`.

### UI copy

- `app/(payload)/admin/campaigns/send-button.tsx` — remove "(stub)" from the button
  label and the success toast.
- `app/(payload)/admin/campaigns/page.tsx` — replace the "stub log; chưa kết nối ESP"
  note with accurate copy.

## Data Flow

```
SendCampaignButton (client)
  → sendCampaignToNewsletterAction (server action)
      → getEmailConfig()                       [env]
      → prisma.newsletterSubscriber.findMany   [recipients]
      → renderCampaignBody(body)               [text + html]
      → sendBulkEmail(...)                      [Resend /emails/batch, chunked 100]
      → prisma.emailCampaign.update(SENT)       [on sent > 0]
```

## Error Handling

- Not configured → inert, DRAFT preserved, clear message.
- No subscribers → DRAFT preserved, clear message.
- Per-chunk HTTP/network failure → counted as `failed`, does not abort other chunks.
- All recipients failed (`sent === 0`) → DRAFT preserved, failure message.
- Partial failure (`sent > 0`) → marked `SENT`, `recipientCount = sent`, failures logged.

## Testing (Vitest, `lib/__tests__/`)

- `renderCampaignBody`: HTML-escapes `<`, `>`, `&`, `"`; converts newlines to `<br>`;
  `text` left raw.
- `sendBulkEmail` with mocked `fetch`:
  - unconfigured (missing env) → `{ configured: false, sent: 0, failed: 0 }`, no fetch.
  - 101 recipients → exactly 2 fetch calls (chunking at 100).
  - one chunk returns non-2xx → those recipients counted in `failed`, the rest in `sent`.

## Env / Config

No `.env.example` exists in the repo. Document `RESEND_API_KEY` and `EMAIL_FROM` in the
header comment of `lib/email/client.ts` so the requirement is discoverable.

## Out of Scope

- Scheduled sends (`scheduledAt` already exists in the model but is not wired here).
- Rich-text/HTML editor for campaign body.
- Unsubscribe links / list management.
- Bounce/complaint webhooks.
