# Gmail SMTP Email Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app actually deliver email by replacing the inert Resend HTTP transport behind `sendEmail()` / `sendBulkEmail()` with Gmail SMTP authenticated by a Google App Password.

**Architecture:** Only `lib/email/client.ts` and `lib/email/send.ts` change transport. Both functions keep their exact current signatures and their "log and no-op when unconfigured" contract, so every caller (verification, password reset, campaigns) is untouched. A single lazily-created, module-level nodemailer transporter against `smtp.gmail.com:587` is shared by both.

**Tech Stack:** Next.js 15, TypeScript (strict), nodemailer, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-15-gmail-smtp-transport-design.md` — read it first.

## Why this work exists (context — the executor has none)

Email verification (registration → emailed link → `emailVerified` set → checkout unblocked) was **fully built on 2026-07-14 and works correctly**. Do not rebuild any of it. The user's bug — "checkout forces me to verify but no email ever arrives" — has exactly one cause:

`lib/email/send.ts:27` gates on `getEmailConfig().configured`, which requires `RESEND_API_KEY` + `EMAIL_FROM`. **Neither is set anywhere.** So it logs `'[email] not configured — skipping send'` and returns without a network call. Tokens are minted and stored correctly; they just never reach anyone.

Orientation map — everything except the send step already works:

| Step | Location |
|---|---|
| Checkout rejects unverified users (403) | `lib/checkout-auth.ts:18` |
| Resend endpoint | `app/api/auth/resend-verification/route.ts:34` |
| Registration issues a token | `app/api/register/route.ts:62` |
| Token minted, link built, send attempted | `lib/email-verification.ts:31` |
| **Silently no-ops here — the bug** | `lib/email/send.ts:27` |
| Link consumed, `emailVerified` set | `lib/email-verification.ts:61` |
| Verify page | `app/[locale]/(storefront)/verify-email/page.tsx` |

**Why Gmail SMTP and not the Gmail API** (the user asked for "a Google API" — do not silently switch back): `gmail.send` is a *restricted* OAuth scope. In Testing mode refresh tokens expire every 7 days, so sending would silently break weekly; escaping Testing mode needs Google verification and possibly a paid security assessment. It would also need a separate OAuth flow to mint a refresh token for the shop's own account — the existing `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` authenticate *customers* and grant no sending rights. SMTP + App Password reaches the same outcome with none of that.

## Global Constraints

- **Never `git add` `.env`, `docker-compose.yml`, or `Dockerfile.private`.** All three are gitignored and contain live secrets. Only `.env.example` is tracked and it gets placeholder values only. A real App Password in a commit is a credential leak requiring rotation.
- **`pnpm <script>` can fail via `runDepsStatusCheck` in this repo.** Call binaries directly: `node_modules/.bin/vitest`, `node_modules/.bin/tsc`.
- **Vitest test files must explicitly `import { describe, it, expect, vi } from 'vitest'`** — `globals: true` is runtime-only and `tsc --noEmit` fails without the import.
- TypeScript is strict. No `any`, no non-null assertions to dodge the checker.
- Both email functions must **never throw**. Failures are logged and returned as `sent: false` / tallied in `failed`.
- `sendBulkEmail` sends **one message per recipient** — never a shared To/BCC. This is what stops customer addresses leaking to each other. Preserve it.
- Comments in this repo explain *why*, not *what*. Match the existing header-comment style in `lib/email/*.ts`.

---

### Task 1: Swap the transport to Gmail SMTP

**Files:**
- Modify: `lib/email/client.ts` (whole file — `getEmailConfig` + `sendBulkEmail`)
- Modify: `lib/email/send.ts` (whole file — `sendEmail`)
- Modify: `package.json` (add `nodemailer`, `@types/nodemailer`)
- Test: `lib/__tests__/email-client.test.ts` (rewrite), `lib/__tests__/email-send.test.ts` (rewrite)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `getEmailConfig(): EmailConfig` where `EmailConfig = { configured: boolean; user: string; appPassword: string; from: string }`
  - `sendEmail(args: { to: string; subject: string; text: string; html: string }): Promise<{ configured: boolean; sent: boolean }>`
  - `sendBulkEmail(args: { subject: string; text: string; html: string; recipients: string[] }): Promise<{ configured: boolean; sent: number; failed: number }>`
  - `getTransporter(): Transporter | null` (internal to `lib/email/client.ts`, exported for reuse by `send.ts`)

  Task 2 depends on `EmailConfig.configured` and the env var names only.

- [ ] **Step 1: Install nodemailer**

```bash
pnpm add nodemailer && pnpm add -D @types/nodemailer
```

Expected: both appear in `package.json`. (The repo's `runDepsStatusCheck` quirk affects `pnpm <script>`, not `pnpm add` — that is why this step uses `pnpm` directly while every later step calls `node_modules/.bin/*`.)

- [ ] **Step 2: Rewrite the client test to the new contract**

Replace the entire contents of `lib/__tests__/email-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { getEmailConfig, sendBulkEmail, resetTransporter } from '@/lib/email/client';

function emails(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `user${i}@example.com`);
}

beforeEach(() => {
  vi.stubEnv('GMAIL_USER', 'shop@gmail.com');
  vi.stubEnv('GMAIL_APP_PASSWORD', 'abcd efgh ijkl mnop');
  vi.stubEnv('EMAIL_FROM', 'Shop <shop@gmail.com>');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  resetTransporter();
});

describe('getEmailConfig', () => {
  it('should be unconfigured when GMAIL_USER is missing', () => {
    vi.stubEnv('GMAIL_USER', '');
    expect(getEmailConfig().configured).toBe(false);
  });

  it('should be unconfigured when GMAIL_APP_PASSWORD is missing', () => {
    vi.stubEnv('GMAIL_APP_PASSWORD', '');
    expect(getEmailConfig().configured).toBe(false);
  });

  it('should be configured when both credentials are present', () => {
    const config = getEmailConfig();
    expect(config.configured).toBe(true);
    expect(config.user).toBe('shop@gmail.com');
    expect(config.from).toBe('Shop <shop@gmail.com>');
  });

  it('should fall back to GMAIL_USER as the sender when EMAIL_FROM is unset', () => {
    vi.stubEnv('EMAIL_FROM', '');
    expect(getEmailConfig().from).toBe('shop@gmail.com');
  });
});

describe('sendBulkEmail', () => {
  it('should be inert and never touch the transport when not configured', async () => {
    vi.stubEnv('GMAIL_APP_PASSWORD', '');

    const result = await sendBulkEmail({
      subject: 's', text: 't', html: '<p>t</p>', recipients: emails(3),
    });

    expect(result).toEqual({ configured: false, sent: 0, failed: 0 });
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('should send one message per recipient and never expose addresses to each other', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'x' });

    const result = await sendBulkEmail({
      subject: 's', text: 't', html: '<p>t</p>', recipients: emails(3),
    });

    expect(result).toEqual({ configured: true, sent: 3, failed: 0 });
    expect(sendMailMock).toHaveBeenCalledTimes(3);
    for (const call of sendMailMock.mock.calls) {
      expect(call[0].to).toEqual(expect.stringMatching(/^user\d@example\.com$/));
      expect(call[0].bcc).toBeUndefined();
    }
  });

  it('should tally a per-recipient rejection as failed without aborting the rest', async () => {
    sendMailMock
      .mockResolvedValueOnce({ messageId: 'x' })
      .mockRejectedValueOnce(new Error('mailbox full'))
      .mockResolvedValueOnce({ messageId: 'z' });

    const result = await sendBulkEmail({
      subject: 's', text: 't', html: '<p>t</p>', recipients: emails(3),
    });

    expect(result).toEqual({ configured: true, sent: 2, failed: 1 });
    expect(sendMailMock).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
node_modules/.bin/vitest run lib/__tests__/email-client.test.ts
```

Expected: FAIL — `resetTransporter` is not exported, and `getEmailConfig` still reads `RESEND_API_KEY`.

- [ ] **Step 4: Rewrite `lib/email/client.ts`**

```ts
// lib/email/client.ts — Gmail SMTP transport, shared by every outbound email.
//
// Required env to activate (inert until both are set):
//   GMAIL_USER          — full Gmail address; SMTP user and default sender
//   GMAIL_APP_PASSWORD  — 16-char App Password (myaccount.google.com/apppasswords),
//                         NOT the account password. Requires 2FA on the account.
//   EMAIL_FROM          — optional display sender; falls back to GMAIL_USER
//
// Gmail caps ~500 recipients/day (2,000 on Workspace) and will temporarily lock
// the account past that. Fine for verification/reset volume; a real ceiling for
// campaigns — that cap is what will eventually force a move to a domain-backed
// provider.
import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '@/lib/logger';

export interface EmailConfig {
  configured: boolean;
  user: string;
  appPassword: string;
  from: string;
}

export interface SendBulkResult {
  configured: boolean;
  sent: number;
  failed: number;
}

export function getEmailConfig(): EmailConfig {
  const user = process.env.GMAIL_USER ?? '';
  const appPassword = process.env.GMAIL_APP_PASSWORD ?? '';
  const from = process.env.EMAIL_FROM || user;
  return { configured: Boolean(user && appPassword), user, appPassword, from };
}

// Built once and reused: a transporter per email would reopen an SMTP
// connection each send, which is slow and burns Gmail's connection budget.
let transporter: Transporter | null = null;

export function getTransporter(): Transporter | null {
  const config = getEmailConfig();
  if (!config.configured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS upgrade on 587
      auth: { user: config.user, pass: config.appPassword },
    });
  }
  return transporter;
}

/** Test seam: drops the cached transporter so env changes take effect. */
export function resetTransporter(): void {
  transporter = null;
}

/**
 * Send one email per recipient (never a shared To/BCC, so addresses are never
 * exposed between customers). SMTP has no batch endpoint, so this is a
 * sequential loop over the pooled connection. Per-recipient failures are
 * tallied as `failed` and never thrown. Returns `{ configured: false, ... }`
 * and skips the network entirely when credentials are missing.
 */
export async function sendBulkEmail(args: {
  subject: string;
  text: string;
  html: string;
  recipients: string[];
}): Promise<SendBulkResult> {
  const { subject, text, html, recipients } = args;
  const config = getEmailConfig();
  const mailer = getTransporter();

  if (!mailer) {
    logger.info(
      { recipients: recipients.length, subject },
      '[email] not configured — skipping send',
    );
    return { configured: false, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      await mailer.sendMail({ from: config.from, to, subject, text, html });
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      logger.warn({ err }, '[email] recipient send failed');
    }
  }

  return { configured: true, sent, failed };
}
```

- [ ] **Step 5: Run the client test and confirm it passes**

```bash
node_modules/.bin/vitest run lib/__tests__/email-client.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Rewrite the send test to the new contract**

Replace the entire contents of `lib/__tests__/email-send.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn();
vi.mock('@/lib/email/client', () => ({
  getEmailConfig: vi.fn(),
  getTransporter: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { sendEmail } from '@/lib/email/send';
import { getEmailConfig, getTransporter } from '@/lib/email/client';
import { logger } from '@/lib/logger';

const getEmailConfigMock = vi.mocked(getEmailConfig);
const getTransporterMock = vi.mocked(getTransporter);

const args = { to: 'buyer@example.com', subject: 'Hi', text: 'hi', html: '<p>hi</p>' };

const configured = {
  configured: true as const,
  user: 'shop@gmail.com',
  appPassword: 'abcd efgh ijkl mnop',
  from: 'Shop <shop@gmail.com>',
};

beforeEach(() => {
  getEmailConfigMock.mockReturnValue(configured);
  getTransporterMock.mockReturnValue({ sendMail: sendMailMock } as never);
});

afterEach(() => vi.clearAllMocks());

describe('sendEmail', () => {
  it('should skip the send and report unconfigured when credentials are missing', async () => {
    getEmailConfigMock.mockReturnValue({
      configured: false, user: '', appPassword: '', from: '',
    });
    getTransporterMock.mockReturnValue(null);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: false, sent: false });
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('should send to the single recipient and report success', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'abc' });

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: true });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'Shop <shop@gmail.com>',
      to: 'buyer@example.com',
      subject: 'Hi',
      text: 'hi',
      html: '<p>hi</p>',
    });
  });

  it('should report failure and log a warning when the transport rejects', async () => {
    sendMailMock.mockRejectedValue(new Error('535 auth failed'));

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 7: Run it and confirm it fails**

```bash
node_modules/.bin/vitest run lib/__tests__/email-send.test.ts
```

Expected: FAIL — `send.ts` still calls `fetch` against Resend and `getTransporter` is not imported there.

- [ ] **Step 8: Rewrite `lib/email/send.ts`**

```ts
// lib/email/send.ts — single-recipient transactional send (verification,
// password reset).
//
// Sibling to lib/email/client.ts's sendBulkEmail: shares that module's Gmail
// SMTP transporter and its credential gating, and keeps the same "log and
// no-op when unconfigured" contract.
import { getEmailConfig, getTransporter } from '@/lib/email/client';
import { logger } from '@/lib/logger';

export interface SendEmailResult {
  configured: boolean;
  sent: boolean;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult> {
  const { to, subject, text, html } = args;
  const config = getEmailConfig();
  const mailer = getTransporter();

  if (!mailer) {
    logger.info({ to, subject }, '[email] not configured — skipping send');
    return { configured: false, sent: false };
  }

  try {
    await mailer.sendMail({ from: config.from, to, subject, text, html });
    return { configured: true, sent: true };
  } catch (err: unknown) {
    logger.warn({ err }, '[email] send failed');
    return { configured: true, sent: false };
  }
}
```

- [ ] **Step 9: Run both email suites and the typechecker**

```bash
node_modules/.bin/vitest run lib/__tests__/email-send.test.ts lib/__tests__/email-client.test.ts
node_modules/.bin/tsc --noEmit
```

Expected: PASS, 10 tests total. `tsc` clean.

- [ ] **Step 10: Run the full suite to prove no caller regressed**

```bash
node_modules/.bin/vitest run
```

Expected: PASS. `lib/__tests__/email-verification.test.ts`, `app/api/register/__tests__/route.test.ts`, and `app/api/auth/resend-verification/__tests__/route.test.ts` all mock at the `sendEmail`/`issueVerificationEmail` boundary, so they should be unaffected. **If any fail, fix the cause — do not weaken or skip the test.**

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml lib/email/client.ts lib/email/send.ts \
        lib/__tests__/email-client.test.ts lib/__tests__/email-send.test.ts
git commit -m "$(cat <<'EOF'
feat(email): send via gmail smtp instead of the inert resend path

sendEmail/sendBulkEmail gated on RESEND_API_KEY + EMAIL_FROM, which were set
nowhere, so every send logged 'not configured' and returned without a network
call — verification tokens were minted but never delivered. Swap the transport
for Gmail SMTP + App Password: no domain to verify, and no restricted
gmail.send scope expiring refresh tokens every 7 days.

Signatures and the no-op-when-unconfigured contract are unchanged, so callers
are untouched. SMTP has no batch endpoint, so bulk becomes a sequential loop
over a pooled connection, still one message per recipient.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Fix the stale env-var name in the campaigns admin message

**Files:**
- Modify: `app/(payload)/admin/campaigns/actions.ts:66`

**Interfaces:**
- Consumes: `getEmailConfig().configured` from Task 1 (unchanged in shape — this file reads only `.configured`, so no structural change is needed).
- Produces: nothing.

**Context:** This is the only consumer of `lib/email/` outside the module itself. It reads `.configured` only, so Task 1's `EmailConfig` reshape does not break it. But line 66 renders a user-facing Vietnamese string naming `RESEND_API_KEY`, which is now the wrong variable and would send an admin looking for a key that no longer does anything.

- [ ] **Step 1: Update the message**

In `app/(payload)/admin/campaigns/actions.ts`, replace:

```ts
  if (!getEmailConfig().configured) {
    return { ok: false, message: 'Email chưa cấu hình (đặt RESEND_API_KEY) — chưa gửi.' };
  }
```

with:

```ts
  if (!getEmailConfig().configured) {
    return {
      ok: false,
      message: 'Email chưa cấu hình (đặt GMAIL_USER và GMAIL_APP_PASSWORD) — chưa gửi.',
    };
  }
```

- [ ] **Step 2: Confirm no other stale references survive**

```bash
grep -rn "RESEND" --include="*.ts" --include="*.tsx" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=generated
```

Expected: no output. If anything remains, update it the same way.

- [ ] **Step 3: Typecheck and commit**

```bash
node_modules/.bin/tsc --noEmit
git add "app/(payload)/admin/campaigns/actions.ts"
git commit -m "$(cat <<'EOF'
fix(campaigns): name the gmail vars in the unconfigured-email notice

The admin-facing string still told operators to set RESEND_API_KEY, which no
longer does anything now that the transport is Gmail SMTP.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Document the env vars

**Files:**
- Modify: `.env.example` (tracked — placeholders only)
- Modify: `docker-compose.yml` (**gitignored — never `git add`**)
- Modify: `Dockerfile.private` (**gitignored — never `git add`**)
- Modify: `DECISIONS.md` (tracked)

**Interfaces:**
- Consumes: the env var names from Task 1 (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`).
- Produces: nothing.

**Context:** `.env`, `docker-compose.yml`, and `Dockerfile.private` are gitignored and hold live secrets (real DB URLs, OAuth secrets, payment keys). Edit them so the app runs locally and in Docker, but **only `.env.example` and `DECISIONS.md` get committed.** A real App Password in a commit is a credential leak requiring rotation.

- [ ] **Step 1: Add the block to `.env.example`**

Insert after the `NEXT_PUBLIC_SITE_URL=...` line (around line 57), before the `# Branding` header:

```bash
# =============================================================================
# Email (Gmail SMTP) — verification, password reset, campaigns
# =============================================================================
# Inert until BOTH GMAIL_USER and GMAIL_APP_PASSWORD are set: sends are logged
# and skipped rather than delivered.
#
# GMAIL_APP_PASSWORD is a 16-char App Password from
# https://myaccount.google.com/apppasswords — NOT your Gmail password. Requires
# 2-Step Verification on the account; Gmail rejects plain SMTP auth without it.
#
# Gmail caps ~500 recipients/day (2,000 on Workspace). Fine for verification and
# password reset; a real ceiling for campaigns.
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
# Optional display sender; falls back to GMAIL_USER.
EMAIL_FROM=Your Store <you@gmail.com>
```

- [ ] **Step 2: Add the same three vars to your local `.env` with REAL values**

Append to `.env` (gitignored — this is where the working credentials live):

```bash
GMAIL_USER=<the shop's gmail address>
GMAIL_APP_PASSWORD=<16-char App Password, no spaces>
EMAIL_FROM=Lô Hobby <the shop's gmail address>
```

If you do not have an App Password yet, leave `.env` alone and stop here — the app stays inert (exactly today's behavior, no regression) until the user generates one. **Do not invent or place a fake value.**

- [ ] **Step 3: Add to `docker-compose.yml` (do NOT commit)**

In the `environment:` block, after the `ADMIN_EMAILS:` line:

```yaml
      # App Password from myaccount.google.com/apppasswords (needs 2FA on the
      # account) — NOT the Gmail password. Both vars must be set or email is inert.
      GMAIL_USER: "you@gmail.com"
      GMAIL_APP_PASSWORD: "xxxxxxxxxxxxxxxx"
      EMAIL_FROM: "Lô Hobby <you@gmail.com>"
```

- [ ] **Step 4: Add to `Dockerfile.private` (do NOT commit)**

In the runtime stage, after the `ENV ADMIN_EMAILS=...` line:

```dockerfile
# App Password from myaccount.google.com/apppasswords (needs 2FA) — not the
# Gmail password. Runtime vars: override per host with `-e` without a rebuild.
ENV GMAIL_USER="you@gmail.com"
ENV GMAIL_APP_PASSWORD="xxxxxxxxxxxxxxxx"
ENV EMAIL_FROM="Lô Hobby <you@gmail.com>"
```

- [ ] **Step 5: Append the decision to `DECISIONS.md`**

```markdown
## 2026-07-15 — Gmail SMTP for outbound email
**Chosen:** Send all outbound email (verification, password reset, campaigns) via Gmail SMTP authenticated with a Google App Password, behind the existing `sendEmail()` / `sendBulkEmail()` interface.
**Alternatives:** Gmail API with OAuth2 (`gmail.send`); Resend's HTTP API (already coded but never activated).
**Why:** Email verification shipped 2026-07-14 but never delivered anything — `sendEmail()` gated on `RESEND_API_KEY` + `EMAIL_FROM`, which were set nowhere, so it logged and no-op'd. Resend needs a domain we own and can verify; without one it only delivers to the account holder's own address. The Gmail API was rejected despite being the user's initial ask: `gmail.send` is a restricted scope, so refresh tokens expire every 7 days while the consent screen is in Testing mode (silent weekly breakage), and leaving Testing requires Google verification and possibly a paid security assessment. It would also need a separate OAuth flow to mint a refresh token for the shop's own account, since the existing `AUTH_GOOGLE_*` credentials only authenticate customers. SMTP + App Password reaches the same outcome — Google sends the mail — with no scopes, no consent screen, and no expiring tokens.
**Trade-offs:** ~500 recipients/day on free Gmail (2,000 on Workspace), enough for verification but a real ceiling for campaigns. Sender is a gmail.com address, not the shop domain, which costs some deliverability and looks less professional. SMTP has no batch endpoint, so bulk sends are a sequential loop and slower than Resend's 100-per-request batching.
**Revisit if:** a shop domain is acquired (switch back to Resend for domain-backed sending and better deliverability), or campaign volume approaches the daily cap.
```

- [ ] **Step 6: Commit ONLY the tracked files**

```bash
git add .env.example DECISIONS.md
git status --short
```

Confirm the output lists **only** `.env.example` and `DECISIONS.md`. If `.env`, `docker-compose.yml`, or `Dockerfile.private` appear as staged, unstage them immediately with `git restore --staged <file>` — they carry live secrets.

```bash
git commit -m "$(cat <<'EOF'
docs(email): document the gmail smtp env vars

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Verify a real email actually arrives

**Files:** none — this is a verification task.

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: nothing.

**Context:** Tests passing does not prove delivery — the whole point of this work is that the code looked fine for a day while silently sending nothing. This task is the acceptance criterion, and it **requires real credentials in `.env`.** If Task 3 Step 2 was skipped because no App Password exists yet, stop and report that to the user; do not mark the plan complete.

- [ ] **Step 1: Confirm the link will not point at localhost in production**

```bash
grep -n "APP_URL" .env
```

`lib/email-verification.ts:39` builds the verification link via `absoluteUrl()` (`lib/utils.ts:37`), which resolves `APP_URL` **at module load**. For a local dev test `http://localhost:3000` is correct. For any real deployment `APP_URL` must be the public https domain, or emailed links will point at localhost and be useless. Report which value is in effect.

- [ ] **Step 2: Start the dev server**

```bash
node_modules/.bin/next dev --turbo
```

- [ ] **Step 3: Register a fresh account against a real inbox you control**

```bash
curl -sS -X POST http://localhost:3000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"<a real inbox you control>","password":"test-password-123","name":"SMTP Test"}' | head -20
```

Expected: HTTP 201 with a `{"user":{...}}` body.

- [ ] **Step 4: Check the server log for the send outcome**

Expected: **no** `'[email] not configured — skipping send'` line (that is the original bug) and **no** `'[email] send failed'` warning. A `535` in a warning means Gmail rejected the credentials — the usual cause is using the account password instead of an App Password, or 2FA not being enabled.

- [ ] **Step 5: Confirm the email arrived and the link verifies the account**

Open the inbox, confirm the message arrived (check spam — a first send from a new sender often lands there), and click the verification link. Expected: the `/verify-email` page renders its success state.

Then confirm the database actually changed:

```bash
node_modules/.bin/prisma studio
```

Expected: that user's `emailVerified` is a timestamp, not null. Checkout will now pass `lib/checkout-auth.ts:18`.

- [ ] **Step 6: Report the outcome honestly**

State plainly whether a real email arrived and whether `emailVerified` was set. If it did not arrive, report the exact log line and stop — **do not** loosen the gate, mark the user verified by hand, or weaken a test to make things look green. Per the repo's debug rules, two failed attempts means stop and present options rather than trying a third variation.

---

## Out of scope — do not bundle these in

- **The silent-success problem.** `/api/auth/resend-verification` returns `ok: true` even when nothing was sent, and `issueVerificationEmail` discards `sendEmail`'s `{ configured: false }` result. This is what hid the bug for a day. It is a real fix but a **separate concern from the transport** — leave it alone unless the user asks. If you do it, keep the enumeration-safe response for *unknown* accounts exactly as-is (the reasoning at `route.ts:25` is sound); only the unconfigured-operator case is worth surfacing.
- Any change to token issuance, the verify page, `consumeVerificationToken`, the checkout gate, or Google auto-verify. **All of these already work.**
- Refactoring anything you pass through on the way. Note it and move on.
