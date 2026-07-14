# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a verified email before checkout — Credentials accounts verify via emailed link, Google accounts auto-verify on first sign-in, login itself stays ungated, and guest checkout is removed.

**Architecture:** Reuse the existing `VerificationToken` table (namespaced by an identifier prefix) and a new single-recipient `sendEmail` sibling to the existing bulk sender. Verification/resend/consumption logic lives in small, prisma-only lib modules so it's unit-testable without dragging in the checkout route's large dependency graph; routes and pages call those modules and translate results into HTTP/UI responses.

**Tech Stack:** Next.js 15 App Router, NextAuth v5 (Credentials + Google), Prisma (`User.emailVerified`, `VerificationToken`), Resend HTTP API, next-intl, Vitest.

**Source spec:** `docs/superpowers/specs/2026-07-14-email-verification-design.md`
**Related decisions:** `DECISIONS.md` — "2026-07-14 — Email verification: small testable lib modules, not inline logic" and "2026-07-14 — Checkout: buyer email now sourced only from the verified session" (already logged; read for the *why* behind Tasks 7–8's structure).

## Global Constraints

- No Prisma schema migration. `User.emailVerified` (`DateTime?`) and `VerificationToken` (`identifier`, `token` unique, `expires`, `@@unique([identifier, token])`) already exist.
- Verification tokens are namespaced `"verify-email:" + email` (lowercased email) so they never collide with password-reset tokens (`identifier = email`) in the same table.
- Verification token TTL is 24 hours (`24 * 60 * 60 * 1000` ms) — longer than password reset's 1 hour.
- Backend/API-layer strings (JSON error messages, email subject/body) are hardcoded Vietnamese, matching the existing convention in `app/api/register/route.ts` and `app/api/auth/forgot-password/route.ts` — NOT run through next-intl.
- Page/component-layer strings use next-intl `t()`. Every new translation key is added to **both** `messages/en.json` and `messages/vi.json` in the same step.
- All email sends are best-effort: failures are caught, logged via `lib/logger`'s `logger`, and never surface as a 500 or block the calling action (registration, resend, password reset).
- Enumeration safety: `POST /api/auth/resend-verification` always responds `{ ok: true }` regardless of whether the account exists or is already verified — mirrors `app/api/auth/forgot-password/route.ts`.
- `emailVerified` is read fresh from Prisma at checkout time (never threaded through the JWT/session), so a verification completed in another tab is picked up immediately.
- Guest checkout is fully removed: `app/api/checkout/route.ts` returns `401` when there is no `userId` — no client-supplied-email fallback.
- Test convention: Vitest, `describe`/`it('should ... when ...')`, `vi.mock(...)` calls at module scope *before* the imports they mock (see `app/api/register/__tests__/route.test.ts`), `afterEach(() => vi.clearAllMocks())`. Run a single test file with `node_modules/.bin/vitest run <path>`; full suite with `node_modules/.bin/vitest run`; typecheck with `node_modules/.bin/tsc --noEmit`. Do **not** use `pnpm test`/`pnpm check-types` — `pnpm <script>` is blocked by this repo's dependency-status check; call the binaries directly.

---

### Task 1: Single-recipient email sender

**Files:**
- Create: `lib/email/send.ts`
- Test: `lib/__tests__/email-send.test.ts`

**Interfaces:**
- Consumes: `getEmailConfig()` from `lib/email/client.ts` (existing, exported) — returns `{ configured: boolean; apiKey: string; from: string }`. `logger` from `lib/logger.ts` (existing).
- Produces: `sendEmail(args: { to: string; subject: string; text: string; html: string }): Promise<{ configured: boolean; sent: boolean }>` from `lib/email/send.ts` — used by Task 2 (forgot-password) and Task 3 (email-verification issuance).

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/email-send.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/email/client', () => ({ getEmailConfig: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

import { sendEmail } from '@/lib/email/send';
import { getEmailConfig } from '@/lib/email/client';
import { logger } from '@/lib/logger';

const getEmailConfigMock = vi.mocked(getEmailConfig);
const fetchMock = vi.fn();

const args = { to: 'buyer@example.com', subject: 'Hi', text: 'hi', html: '<p>hi</p>' };

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('sendEmail', () => {
  it('should skip the network call and report unconfigured when credentials are missing', async () => {
    getEmailConfigMock.mockReturnValue({ configured: false, apiKey: '', from: '' });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: false, sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('should send a single-recipient request and report success on a 2xx response', async () => {
    getEmailConfigMock.mockReturnValue({
      configured: true,
      apiKey: 'key_test',
      from: 'Shop <shop@example.com>',
    });
    fetchMock.mockResolvedValue({ ok: true, json: vi.fn() });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key_test' }),
        body: JSON.stringify({
          from: 'Shop <shop@example.com>',
          to: ['buyer@example.com'],
          subject: 'Hi',
          text: 'hi',
          html: '<p>hi</p>',
        }),
      }),
    );
  });

  it('should report failure and log a warning on a non-2xx response', async () => {
    getEmailConfigMock.mockReturnValue({ configured: true, apiKey: 'key_test', from: 'shop@example.com' });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ message: 'bad' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should report failure and log a warning when the network call throws', async () => {
    getEmailConfigMock.mockReturnValue({ configured: true, apiKey: 'key_test', from: 'shop@example.com' });
    fetchMock.mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendEmail(args);

    expect(result).toEqual({ configured: true, sent: false });
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/email-send.test.ts`
Expected: FAIL — `Cannot find module '@/lib/email/send'` (or similar resolution error).

- [ ] **Step 3: Write the implementation**

Create `lib/email/send.ts`:

```ts
// lib/email/send.ts — single-recipient email send via Resend's HTTP API.
//
// Sibling to lib/email/client.ts's sendBulkEmail: same credential gating
// (RESEND_API_KEY + EMAIL_FROM), same "log and no-op when unconfigured"
// behavior. Used for transactional, one-recipient sends (password reset,
// email verification) where the batch endpoint's shared-request shape isn't
// needed.
import { getEmailConfig } from '@/lib/email/client';
import { logger } from '@/lib/logger';

const SEND_URL = 'https://api.resend.com/emails';

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

  if (!config.configured) {
    logger.info({ to, subject }, '[email] not configured — skipping send');
    return { configured: false, sent: false };
  }

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.from, to: [to], subject, text, html }),
    });
    if (res.ok) {
      return { configured: true, sent: true };
    }
    const detail = await res.json().catch(() => ({}));
    logger.warn({ status: res.status, detail }, '[email] send failed');
    return { configured: true, sent: false };
  } catch (err: unknown) {
    logger.warn({ err }, '[email] send threw');
    return { configured: true, sent: false };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/email-send.test.ts`
Expected: PASS (4/4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/email/send.ts lib/__tests__/email-send.test.ts
git commit -m "feat(email): add single-recipient sendEmail alongside bulk sender"
```

---

### Task 2: Wire real delivery into forgot-password (fixes the production email gap)

**Files:**
- Modify: `app/api/auth/forgot-password/route.ts` (full file, 61 lines)
- Test: Create `app/api/auth/forgot-password/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `sendEmail` from `lib/email/send.ts` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `app/api/auth/forgot-password/__tests__/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import { POST } from '@/app/api/auth/forgot-password/route';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const deleteManyMock = vi.mocked(prisma.verificationToken.deleteMany);
const createMock = vi.mocked(prisma.verificationToken.create);
const sendEmailMock = vi.mocked(sendEmail);

function post(body: unknown): Request {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/forgot-password', () => {
  it('should respond ok without sending when the email is not registered', async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(post({ email: 'nobody@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('should issue a token and send a reset email for a registered address', async () => {
    findUniqueMock.mockResolvedValue({ id: 'u1' } as never);
    sendEmailMock.mockResolvedValue({ configured: true, sent: true });

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { identifier: 'buyer@example.com' } });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', subject: 'Đặt lại mật khẩu' }),
    );
  });

  it('should still respond ok when the email send fails', async () => {
    findUniqueMock.mockResolvedValue({ id: 'u1' } as never);
    sendEmailMock.mockResolvedValue({ configured: true, sent: false });

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('should reject an invalid email before touching the database', async () => {
    const res = await POST(post({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/auth/forgot-password/__tests__/route.test.ts`
Expected: FAIL — the "issue a token" and "still respond ok" tests fail because the current route logs a warning/debug line instead of calling `sendEmail` (the mock's `toHaveBeenCalledWith` assertion fails since it's never called).

- [ ] **Step 3: Replace the implementation**

Replace the full contents of `app/api/auth/forgot-password/route.ts`:

```ts
// app/api/auth/forgot-password/route.ts — issue a password-reset token
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/utils';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request): Promise<NextResponse> {
  let email = '';
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Nội dung không hợp lệ' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
  }

  // Always respond with success to avoid revealing whether an email is registered.
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_TTL_MS);

      // Clear any previous reset tokens for this email, then store the new one.
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

      const resetUrl = absoluteUrl(`/reset-password?token=${token}`);
      const result = await sendEmail({
        to: email,
        subject: 'Đặt lại mật khẩu',
        text: `Nhấp vào liên kết sau để đặt lại mật khẩu của bạn: ${resetUrl}\n\nLiên kết có hiệu lực trong 1 giờ.`,
        html: `<p>Nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Liên kết có hiệu lực trong 1 giờ.</p>`,
      });

      // No email provider configured: the reset URL contains a live token, so
      // it must NEVER hit production logs. In development we print it so the
      // flow stays testable without Resend credentials.
      if (!result.configured && process.env.NODE_ENV !== 'production') {
        logger.debug(
          { route: '/api/auth/forgot-password', resetUrl },
          'password reset link (dev only, email not configured)',
        );
      }
    }
  } catch (error) {
    logger.error({ route: '/api/auth/forgot-password', err: error }, 'password reset failed');
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/auth/forgot-password/__tests__/route.test.ts`
Expected: PASS (4/4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/forgot-password/route.ts app/api/auth/forgot-password/__tests__/route.test.ts
git commit -m "fix(auth): send real password-reset emails via Resend"
```

---

### Task 3: Verification token issuance & consumption

**Files:**
- Create: `lib/email-verification.ts`
- Test: `lib/__tests__/email-verification.test.ts`

**Interfaces:**
- Consumes: `sendEmail` from `lib/email/send.ts` (Task 1), `prisma` from `lib/prisma.ts` (existing), `absoluteUrl` from `lib/utils.ts` (existing), `logger` from `lib/logger.ts` (existing).
- Produces (used by Tasks 4, 5, 6):
  - `verificationIdentifier(email: string): string`
  - `issueVerificationEmail(email: string): Promise<void>` — throws on failure; callers decide how to swallow it.
  - `consumeVerificationToken(token: string): Promise<ConsumeVerificationResult>` where `ConsumeVerificationResult = { status: 'success'; email: string } | { status: 'expired' } | { status: 'invalid' }`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/email-verification.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    user: { update: vi.fn() },
  },
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import {
  consumeVerificationToken,
  issueVerificationEmail,
  verificationIdentifier,
} from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';

const deleteManyMock = vi.mocked(prisma.verificationToken.deleteMany);
const createMock = vi.mocked(prisma.verificationToken.create);
const findUniqueMock = vi.mocked(prisma.verificationToken.findUnique);
const deleteMock = vi.mocked(prisma.verificationToken.delete);
const updateMock = vi.mocked(prisma.user.update);
const sendEmailMock = vi.mocked(sendEmail);

afterEach(() => {
  vi.clearAllMocks();
});

describe('verificationIdentifier', () => {
  it('should namespace the identifier so it never collides with a password-reset token for the same email', () => {
    expect(verificationIdentifier('buyer@example.com')).toBe('verify-email:buyer@example.com');
    expect(verificationIdentifier('buyer@example.com')).not.toBe('buyer@example.com');
  });
});

describe('issueVerificationEmail', () => {
  it('should clear prior verification tokens, store a new one, and send the email', async () => {
    sendEmailMock.mockResolvedValue({ configured: true, sent: true });

    await issueVerificationEmail('buyer@example.com');

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { identifier: 'verify-email:buyer@example.com' },
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    const createArgs = createMock.mock.calls[0][0] as {
      data: { identifier: string; token: string; expires: Date };
    };
    expect(createArgs.data.identifier).toBe('verify-email:buyer@example.com');
    expect(createArgs.data.token).toHaveLength(64);
    expect(createArgs.data.expires.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', subject: 'Xác minh địa chỉ email' }),
    );
  });
});

describe('consumeVerificationToken', () => {
  it('should return invalid for a missing token', async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await consumeVerificationToken('missing-token');

    expect(result).toEqual({ status: 'invalid' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should return invalid for a token that is not a verification token (foreign identifier)', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() + 1000),
    } as never);

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'invalid' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should return expired and delete the token when past its expiry', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'verify-email:buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() - 1000),
    } as never);

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'expired' });
    expect(deleteMock).toHaveBeenCalledWith({ where: { token: 'tok' } });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should mark the user verified and delete the token on success', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'verify-email:buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() + 1000),
    } as never);
    updateMock.mockResolvedValue({} as never);

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'success', email: 'buyer@example.com' });
    expect(updateMock).toHaveBeenCalledWith({
      where: { email: 'buyer@example.com' },
      data: { emailVerified: expect.any(Date) },
    });
    expect(deleteMock).toHaveBeenCalledWith({ where: { token: 'tok' } });
  });

  it('should return invalid without deleting the token when the user update fails', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'verify-email:buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() + 1000),
    } as never);
    updateMock.mockRejectedValue(new Error('user not found'));

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'invalid' });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/email-verification.test.ts`
Expected: FAIL — `Cannot find module '@/lib/email-verification'`.

- [ ] **Step 3: Write the implementation**

Create `lib/email-verification.ts`:

```ts
// lib/email-verification.ts — email-verification token issuance & consumption.
//
// Reuses the same VerificationToken table as password reset, namespaced by
// the `verify-email:` identifier prefix so the two token kinds never collide
// for the same email.
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';
import { absoluteUrl } from '@/lib/utils';
import { logger } from '@/lib/logger';

const VERIFY_PREFIX = 'verify-email:';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function verificationIdentifier(email: string): string {
  return `${VERIFY_PREFIX}${email}`;
}

export type ConsumeVerificationResult =
  | { status: 'success'; email: string }
  | { status: 'expired' }
  | { status: 'invalid' };

/**
 * Issues a fresh verification token for `email` and sends the verification
 * link. Any previous verification tokens for the same email are cleared
 * first (mirrors the forgot-password `deleteMany` pattern). Throws on
 * failure — callers (registration, resend) decide how to swallow it, since
 * "email is best-effort" varies by call site.
 */
export async function issueVerificationEmail(email: string): Promise<void> {
  const identifier = verificationIdentifier(email);
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  const verifyUrl = absoluteUrl(`/verify-email?token=${token}`);
  const result = await sendEmail({
    to: email,
    subject: 'Xác minh địa chỉ email',
    text: `Nhấp vào liên kết sau để xác minh email của bạn: ${verifyUrl}\n\nLiên kết có hiệu lực trong 24 giờ.`,
    html: `<p>Nhấp vào liên kết sau để xác minh email của bạn:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Liên kết có hiệu lực trong 24 giờ.</p>`,
  });

  if (!result.configured && process.env.NODE_ENV !== 'production') {
    logger.debug(
      { route: 'email-verification', verifyUrl },
      'verification link (dev only, email not configured)',
    );
  }
}

/**
 * Consumes a verification token: looks it up, checks expiry, marks the
 * matching user verified, and deletes the token (one-time use). Returns
 * `'invalid'` for a missing, foreign (non-`verify-email:`), or
 * already-consumed token, and `'expired'` for a stale one.
 */
export async function consumeVerificationToken(token: string): Promise<ConsumeVerificationResult> {
  if (!token) return { status: 'invalid' };

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith(VERIFY_PREFIX)) {
    return { status: 'invalid' };
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
    return { status: 'expired' };
  }

  const email = record.identifier.slice(VERIFY_PREFIX.length);
  try {
    await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  } catch (error) {
    logger.error({ route: 'email-verification', err: error }, 'failed to mark user verified');
    return { status: 'invalid' };
  }
  await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);

  return { status: 'success', email };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/email-verification.test.ts`
Expected: PASS (7/7 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/email-verification.ts lib/__tests__/email-verification.test.ts
git commit -m "feat(auth): add email-verification token issuance and consumption"
```

---

### Task 4: Send a verification email on registration

**Files:**
- Modify: `app/api/register/route.ts`
- Modify: `app/api/register/__tests__/route.test.ts` (full file, 82 lines)

**Interfaces:**
- Consumes: `issueVerificationEmail(email: string): Promise<void>` from `lib/email-verification.ts` (Task 3).

- [ ] **Step 1: Update the test file (written first, will fail against the current route)**

Replace the full contents of `app/api/register/__tests__/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/admin', () => ({ isAdminEmail: vi.fn(() => false) }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock('@/lib/email-verification', () => ({ issueVerificationEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { POST } from '@/app/api/register/route';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { issueVerificationEmail } from '@/lib/email-verification';

const isAdminEmailMock = vi.mocked(isAdminEmail);
const findUniqueMock = vi.mocked(prisma.user.findUnique);
const createMock = vi.mocked(prisma.user.create);
const issueVerificationEmailMock = vi.mocked(issueVerificationEmail);

function post(body: unknown): Request {
  return new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'buyer@example.com', password: 'password123', name: 'Buyer' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/register', () => {
  it('should reject registration for an email on the admin allowlist', async () => {
    isAdminEmailMock.mockReturnValue(true);

    const res = await POST(post({ ...validBody, email: 'admin@shop.test' }) as never);

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Email này không thể tự đăng ký' });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject an invalid email before checking the admin allowlist', async () => {
    isAdminEmailMock.mockReturnValue(true);

    const res = await POST(post({ ...validBody, email: 'not-an-email' }) as never);

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject when the email is already registered', async () => {
    isAdminEmailMock.mockReturnValue(false);
    findUniqueMock.mockResolvedValue({ id: 'u1' } as never);

    const res = await POST(post(validBody) as never);

    expect(res.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create a non-admin user and send a verification email for a valid, unregistered email', async () => {
    isAdminEmailMock.mockReturnValue(false);
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'u1',
      email: validBody.email,
      name: validBody.name,
      createdAt: new Date(),
    } as never);
    issueVerificationEmailMock.mockResolvedValue(undefined);

    const res = await POST(post(validBody) as never);

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(issueVerificationEmailMock).toHaveBeenCalledWith(validBody.email);
  });

  it('should still return 201 when the verification email fails to send', async () => {
    isAdminEmailMock.mockReturnValue(false);
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'u1',
      email: validBody.email,
      name: validBody.name,
      createdAt: new Date(),
    } as never);
    issueVerificationEmailMock.mockRejectedValue(new Error('resend down'));

    const res = await POST(post(validBody) as never);

    expect(res.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/register/__tests__/route.test.ts`
Expected: FAIL — `expect(issueVerificationEmailMock).toHaveBeenCalledWith(...)` fails (never called); the mocked module also isn't imported by the route yet.

- [ ] **Step 3: Update the implementation**

In `app/api/register/route.ts`, replace the import block:

```ts
// app/api/register/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
```

with:

```ts
// app/api/register/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAdminEmail } from '@/lib/admin';
import { issueVerificationEmail } from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
```

Then replace:

```ts
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
```

with:

```ts
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    // Best-effort — the account is created regardless of whether the
    // verification email goes out; verification can always be resent.
    try {
      await issueVerificationEmail(email);
    } catch (error) {
      logger.error({ route: '/api/register', err: error }, 'verification email failed');
    }

    return NextResponse.json({ user }, { status: 201 });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/register/__tests__/route.test.ts`
Expected: PASS (5/5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/register/route.ts app/api/register/__tests__/route.test.ts
git commit -m "feat(auth): send a verification email on registration"
```

---

### Task 5: Resend-verification endpoint

**Files:**
- Create: `app/api/auth/resend-verification/route.ts`
- Test: `app/api/auth/resend-verification/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `issueVerificationEmail(email: string): Promise<void>` from `lib/email-verification.ts` (Task 3).
- Produces: `POST /api/auth/resend-verification` — used by the shared `ResendVerificationForm` component (Task 6) and the checkout blocking screen (Task 8).

This endpoint's path starts with `/api/auth`, so it's already covered by the existing rate-limit branch in `middleware.ts` (`if (pathname.startsWith('/api/auth') || pathname === '/api/register') { ... RATE_LIMIT_PRESETS.auth ... }`, `middleware.ts:127-130`) — **no `middleware.ts` change is needed.** `RATE_LIMIT_PRESETS.auth` is currently `{ limit: 20, windowMs: 60_000 }` (`lib/rate-limit.ts:81`); do not change this value — it already exceeds the spec's "5/min minimum" and register/login share the same bucket.

- [ ] **Step 1: Write the failing test**

Create `app/api/auth/resend-verification/__tests__/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/email-verification', () => ({ issueVerificationEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { POST } from '@/app/api/auth/resend-verification/route';
import { prisma } from '@/lib/prisma';
import { issueVerificationEmail } from '@/lib/email-verification';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const issueVerificationEmailMock = vi.mocked(issueVerificationEmail);

function post(body: unknown): Request {
  return new Request('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/resend-verification', () => {
  it('should reject an invalid email', async () => {
    const res = await POST(post({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should respond ok without resending for a non-existent account (enumeration-safe)', async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(post({ email: 'nobody@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(issueVerificationEmailMock).not.toHaveBeenCalled();
  });

  it('should respond ok without resending for an already-verified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(issueVerificationEmailMock).not.toHaveBeenCalled();
  });

  it('should resend and respond ok for an unverified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);
    issueVerificationEmailMock.mockResolvedValue(undefined);

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(issueVerificationEmailMock).toHaveBeenCalledWith('buyer@example.com');
  });

  it('should still respond ok when issuing the email throws', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);
    issueVerificationEmailMock.mockRejectedValue(new Error('resend down'));

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/auth/resend-verification/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/auth/resend-verification/route'`.

- [ ] **Step 3: Write the implementation**

Create `app/api/auth/resend-verification/route.ts`:

```ts
// app/api/auth/resend-verification/route.ts — re-issue an email-verification link
import { NextResponse } from 'next/server';
import { issueVerificationEmail } from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request): Promise<NextResponse> {
  let email = '';
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Nội dung không hợp lệ' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
  }

  // Always respond with success — identical whether the account exists or is
  // already verified — to avoid revealing account existence (enumeration-safe,
  // mirrors forgot-password).
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });
    if (user && !user.emailVerified) {
      await issueVerificationEmail(email);
    }
  } catch (error) {
    logger.error({ route: '/api/auth/resend-verification', err: error }, 'resend verification failed');
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/auth/resend-verification/__tests__/route.test.ts`
Expected: PASS (5/5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/resend-verification/route.ts app/api/auth/resend-verification/__tests__/route.test.ts
git commit -m "feat(auth): add resend-verification endpoint"
```

---

### Task 6: Verify-email page and shared resend form

**Files:**
- Create: `components/resend-verification-form.tsx`
- Create: `app/[locale]/(storefront)/verify-email/page.tsx`
- Modify: `messages/en.json`, `messages/vi.json`

**Interfaces:**
- Consumes: `consumeVerificationToken(token: string): Promise<ConsumeVerificationResult>` from `lib/email-verification.ts` (Task 3, `ConsumeVerificationResult = { status: 'success'; email: string } | { status: 'expired' } | { status: 'invalid' }`); `auth()` from `@/auth` (existing); `POST /api/auth/resend-verification` (Task 5).
- Produces: default-exported `ResendVerificationForm({ initialEmail?: string })` client component, reused by the checkout blocking screen (Task 8).

**No dedicated test file for this task.** This repo does not unit-test page components or the client forms next to them (`app/[locale]/(storefront)/reset-password/page.tsx`, `reset-password-form.tsx`, and `app/[locale]/(storefront)/checkout/page.tsx` all have zero test coverage today) — this task follows that existing convention (existing-code.md §2: follow established patterns). Correctness of the underlying logic is already covered by Task 3's `consumeVerificationToken` tests (valid/expired/invalid/missing token). Verify this task with a typecheck and the full suite instead of a new test file.

- [ ] **Step 1: Create the shared resend-verification form**

Create `components/resend-verification-form.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900';

export default function ResendVerificationForm({
  initialEmail = '',
}: {
  initialEmail?: string;
}): ReactElement {
  const t = useTranslations('auth');
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        toast.error(t('resendVerificationError'));
        return;
      }
      toast.success(t('resendVerificationSent'));
    } catch {
      toast.error(t('resendVerificationError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="resend-verification-email" className="mb-1 block text-sm font-medium">
          {t('resendVerificationEmailLabel')}
        </label>
        <input
          id="resend-verification-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {submitting ? t('resendVerificationSubmitting') : t('resendVerificationSubmit')}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the verify-email page**

Create `app/[locale]/(storefront)/verify-email/page.tsx`:

```tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import Footer from '@/components/layout/footer';
import ResendVerificationForm from '@/components/resend-verification-form';
import { consumeVerificationToken } from '@/lib/email-verification';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return {
    title: t('verifyEmailMetaTitle'),
    description: t('verifyEmailMetaDescription'),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{ token?: string }>;

export default async function VerifyEmailPage(props: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const t = await getTranslations('auth');
  const { token } = await props.searchParams;

  const result = token ? await consumeVerificationToken(token) : ({ status: 'invalid' } as const);

  let continueHref = '/login';
  if (result.status === 'success') {
    const session = await auth();
    if (session?.user?.email?.toLowerCase() === result.email) {
      continueHref = '/checkout';
    }
  }

  return (
    <>
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-raised p-6 shadow-soft-md">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
            {t('verifyEmailHeading')}
          </h1>
          {result.status === 'success' ? (
            <>
              <p className="mb-6 text-sm text-warm-600 dark:text-warm-400">
                {t('verifyEmailSuccessBody')}
              </p>
              <Link
                href={continueHref}
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
              >
                {continueHref === '/checkout'
                  ? t('verifyEmailContinueCheckout')
                  : t('verifyEmailContinueLogin')}
              </Link>
            </>
          ) : (
            <>
              <p className="mb-6 rounded-xl border border-terracotta-200 bg-terracotta-50 px-3 py-2.5 text-sm text-terracotta-700 dark:border-terracotta-900 dark:bg-terracotta-950 dark:text-terracotta-300">
                {t('verifyEmailNeedsLinkBody')}
              </p>
              <ResendVerificationForm />
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Add translation keys**

In `messages/en.json`, inside the `auth` object, add these keys immediately after `"resetPasswordSubmit": "Reset password",` (before `"adminRequiredTitle"`):

```json
    "verifyEmailMetaTitle": "Verify email",
    "verifyEmailMetaDescription": "Verify your email address to complete checkout.",
    "verifyEmailHeading": "Verify email",
    "verifyEmailSuccessBody": "Your email has been verified.",
    "verifyEmailContinueLogin": "Sign in",
    "verifyEmailContinueCheckout": "Continue to checkout",
    "verifyEmailNeedsLinkBody": "This link is invalid or has expired. Enter your email to request a new one.",
    "resendVerificationEmailLabel": "Email",
    "resendVerificationSubmit": "Resend verification email",
    "resendVerificationSubmitting": "Sending...",
    "resendVerificationSent": "If that email is registered and unverified, a new link has been sent.",
    "resendVerificationError": "Something went wrong. Please try again.",
```

In `messages/vi.json`, inside the `auth` object, add the same keys at the same position:

```json
    "verifyEmailMetaTitle": "Xác minh email",
    "verifyEmailMetaDescription": "Xác minh địa chỉ email để hoàn tất thanh toán.",
    "verifyEmailHeading": "Xác minh email",
    "verifyEmailSuccessBody": "Email của bạn đã được xác minh.",
    "verifyEmailContinueLogin": "Đăng nhập",
    "verifyEmailContinueCheckout": "Tiếp tục thanh toán",
    "verifyEmailNeedsLinkBody": "Liên kết không hợp lệ hoặc đã hết hạn. Nhập email để nhận liên kết mới.",
    "resendVerificationEmailLabel": "Email",
    "resendVerificationSubmit": "Gửi lại email xác minh",
    "resendVerificationSubmitting": "Đang gửi...",
    "resendVerificationSent": "Nếu email này đã đăng ký và chưa xác minh, một liên kết mới đã được gửi.",
    "resendVerificationError": "Đã xảy ra lỗi. Vui lòng thử lại.",
```

Both files must remain valid JSON (run the check in Step 4).

- [ ] **Step 4: Typecheck and run the full suite**

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors from the new/modified files.

Run: `node_modules/.bin/vitest run`
Expected: all tests still pass (this task adds no new test file; it must not break Task 3's `lib/__tests__/email-verification.test.ts` or any other existing test).

Also sanity-check the JSON is well-formed:
Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/vi.json')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add components/resend-verification-form.tsx app/[locale]/(storefront)/verify-email/page.tsx messages/en.json messages/vi.json
git commit -m "feat(auth): add verify-email page and resend form"
```

---

### Task 7: Google OAuth auto-verify

**Files:**
- Create: `lib/auth-verify.ts`
- Test: `lib/__tests__/auth-verify.test.ts`
- Modify: `auth.ts` (81 lines)

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts` (existing).
- Produces: `autoVerifyGoogleUser(userId: string): Promise<void>`, called from `auth.ts`'s new `signIn` callback.

This callback is added in `auth.ts` (not the edge-safe `auth.config.ts`) because it needs Prisma, matching how `auth.ts` already extends `authConfig` with the `PrismaAdapter` and the `jwt` callback re-hydration logic.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auth-verify.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { autoVerifyGoogleUser } from '@/lib/auth-verify';
import { prisma } from '@/lib/prisma';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const updateMock = vi.mocked(prisma.user.update);

afterEach(() => {
  vi.clearAllMocks();
});

describe('autoVerifyGoogleUser', () => {
  it('should mark the user verified when not already verified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    await autoVerifyGoogleUser('u1');

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it('should not write when already verified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    await autoVerifyGoogleUser('u1');

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should not throw and not write when the user does not exist', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(autoVerifyGoogleUser('missing')).resolves.toBeUndefined();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/auth-verify.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth-verify'`.

- [ ] **Step 3: Write the implementation**

Create `lib/auth-verify.ts`:

```ts
// lib/auth-verify.ts — Google OAuth auto-verification, called from auth.ts's signIn callback.
import { prisma } from '@/lib/prisma';

/**
 * Marks a user's email verified on first Google sign-in — Google has already
 * confirmed the address, so no separate verification link is needed. No-ops
 * (and skips the write) when already verified, so normal sign-ins don't add
 * DB load.
 */
export async function autoVerifyGoogleUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (user && !user.emailVerified) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }
}
```

Then in `auth.ts`, replace:

```ts
import { authConfig } from '@/auth.config';
import { prisma } from '@/lib/prisma';
```

with:

```ts
import { authConfig } from '@/auth.config';
import { autoVerifyGoogleUser } from '@/lib/auth-verify';
import { prisma } from '@/lib/prisma';
```

And replace:

```ts
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
```

with:

```ts
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === 'google' && typeof user.id === 'string') {
        await autoVerifyGoogleUser(user.id);
      }
      return true;
    },
    async jwt(params) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/auth-verify.test.ts`
Expected: PASS (3/3 tests)

Then typecheck `auth.ts`'s edit:
Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/auth-verify.ts lib/__tests__/auth-verify.test.ts auth.ts
git commit -m "feat(auth): auto-verify email on Google sign-in"
```

---

### Task 8: Checkout gate — remove guest checkout, require verified email

**Files:**
- Create: `lib/checkout-auth.ts`
- Test: `lib/__tests__/checkout-auth.test.ts`
- Test: Create `app/api/checkout/__tests__/route.test.ts`
- Modify: `app/api/checkout/route.ts`
- Modify: `app/[locale]/(storefront)/checkout/page.tsx` (120 lines)
- Modify: `messages/en.json`, `messages/vi.json`

**Interfaces:**
- Consumes: `prisma` (existing), `ResendVerificationForm` from `components/resend-verification-form.tsx` (Task 6).
- Produces: `requireVerifiedCheckoutUser(userId: string | null): Promise<CheckoutAuthResult>` where `CheckoutAuthResult = { ok: true } | { ok: false; status: 401 | 403; error: string }`.

This gate is extracted into its own module rather than inlined in the route so it can be unit-tested without mocking `app/api/checkout/route.ts`'s ~20 other dependencies (see `DECISIONS.md`, "Email verification: small testable lib modules, not inline logic").

- [ ] **Step 1: Write the failing test for the gate module**

Create `lib/__tests__/checkout-auth.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { requireVerifiedCheckoutUser } from '@/lib/checkout-auth';
import { prisma } from '@/lib/prisma';

const findUniqueMock = vi.mocked(prisma.user.findUnique);

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireVerifiedCheckoutUser', () => {
  it('should return 401 when there is no session', async () => {
    const result = await requireVerifiedCheckoutUser(null);

    expect(result).toEqual({ ok: false, status: 401, error: expect.any(String) });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should return 403 when the account exists but is unverified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it('should return 403 when the account cannot be found', async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it('should return ok for a verified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/checkout-auth.test.ts`
Expected: FAIL — `Cannot find module '@/lib/checkout-auth'`.

- [ ] **Step 3: Write the gate module**

Create `lib/checkout-auth.ts`:

```ts
// lib/checkout-auth.ts — checkout authorization gate: verified accounts only.
import { prisma } from '@/lib/prisma';

export type CheckoutAuthResult = { ok: true } | { ok: false; status: 401 | 403; error: string };

/**
 * Enforces the checkout authorization boundary: a session is required, and
 * the account's email must be verified. Reads `emailVerified` fresh from
 * Prisma (not the JWT) so a verification completed in another tab is picked
 * up immediately without a session refresh.
 */
export async function requireVerifiedCheckoutUser(userId: string | null): Promise<CheckoutAuthResult> {
  if (!userId) {
    return { ok: false, status: 401, error: 'Vui lòng đăng nhập để thanh toán.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) {
    return { ok: false, status: 403, error: 'Vui lòng xác minh email trước khi thanh toán.' };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/checkout-auth.test.ts`
Expected: PASS (4/4 tests)

- [ ] **Step 5: Write the failing test for the checkout route's gate wiring**

Create `app/api/checkout/__tests__/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    purchaseEvent: { create: vi.fn() },
  },
}));

import { POST } from '@/app/api/checkout/route';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const authMock = vi.mocked(auth);
const findUniqueMock = vi.mocked(prisma.user.findUnique);

function post(body: unknown): Request {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/checkout — authorization gate', () => {
  it('should reject an unauthenticated request with 401', async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should reject a logged-in but unverified account with 403', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', email: 'buyer@example.com' } } as never);
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(403);
  });

  it('should reject when the account cannot be found with 403', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', email: 'buyer@example.com' } } as never);
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(403);
  });

  it('should pass the gate for a verified account and fail on body validation instead', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', email: 'buyer@example.com' } } as never);
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Dữ liệu thanh toán không hợp lệ' });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node_modules/.bin/vitest run app/api/checkout/__tests__/route.test.ts`
Expected: FAIL — the 401/403 tests get back `400` instead (current route parses the body and hits guest-email validation before ever checking `userId`).

- [ ] **Step 7: Wire the gate into the checkout route**

In `app/api/checkout/route.ts`, add the import — replace:

```ts
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';
```

with:

```ts
import { boundedString, requestHasConsent } from '@/lib/analytics/track-server';
import { requireVerifiedCheckoutUser } from '@/lib/checkout-auth';
```

Remove the now-unused email regex — replace:

```ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDuplicateOrderError(error: unknown): boolean {
```

with:

```ts
function isDuplicateOrderError(error: unknown): boolean {
```

Replace the session/body/guest-email block:

```ts
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const raw: unknown = await req.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: 'Dữ liệu thanh toán không hợp lệ' }, { status: 400 });
  }

  const buyerEmail = body.customerInfo.email ?? session?.user?.email ?? null;
  if (!userId && (!buyerEmail || !EMAIL_RE.test(buyerEmail))) {
    return NextResponse.json(
      { error: 'Vui lòng nhập email hợp lệ để nhận xác nhận đơn hàng.' },
      { status: 400 },
    );
  }
```

with:

```ts
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const gate = await requireVerifiedCheckoutUser(userId);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const raw: unknown = await req.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: 'Dữ liệu thanh toán không hợp lệ' }, { status: 400 });
  }

  const buyerEmail = session?.user?.email ?? null;
```

(`body.customerInfo.email` still exists on the parsed type — it's now unread by `buyerEmail`, left in place per `DECISIONS.md`'s "buyer email now sourced only from the verified session" entry.)

- [ ] **Step 8: Run test to verify it passes**

Run: `node_modules/.bin/vitest run app/api/checkout/__tests__/route.test.ts`
Expected: PASS (4/4 tests)

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors (confirms `EMAIL_RE` removal didn't leave a dangling reference, and `gate`/`buyerEmail` types check out).

- [ ] **Step 9: Update the checkout page**

No dedicated test file for the page itself (same rationale as Task 6 — no `page.tsx` in this repo is unit-tested, confirmed by inspection: no test imports a page component or mocks `redirect()` from one, and the vitest jsdom project only covers `components/**`, not `app/**` pages). User decision (2026-07-14): accept this gap rather than invent a new, unverified testing pattern. The redirect-when-logged-out and unverified-blocking-screen behavior is a thin wrapper around `requireVerifiedCheckoutUser`, which Step 1–4 already cover; verify this step with the typecheck/full-suite run in Step 11 plus a manual smoke check (log in with an unverified account, confirm the blocking screen renders and the resend button works; visit `/checkout` logged out, confirm the redirect to `/login?callbackUrl=/checkout`).

Replace the full contents of `app/[locale]/(storefront)/checkout/page.tsx`:

```tsx
// app/checkout/page.tsx
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { auth } from '@/auth';
import CheckoutForm, { type SavedAddress } from '@/components/checkout-form';
import ResendVerificationForm from '@/components/resend-verification-form';
import { getCart } from '@/lib/cart';
import { getCheckoutPaymentMethods } from '@/lib/payment-methods';
import { prisma } from '@/lib/prisma';
import { getShippingSettings } from '@/lib/shipping-settings';
import { getStoreSettings } from '@/lib/store-settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage(): Promise<ReactElement> {
  const t = await getTranslations('checkout');
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/checkout');
  }

  const userId = session.user.id;

  const [cart, dbUser] = await Promise.all([
    getCart(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
  ]);

  if (!dbUser?.emailVerified) {
    return (
      <section className="mx-auto max-w-screen-sm px-4 py-12 md:py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-line bg-surface-raised p-6 shadow-soft-md">
          <h1 className="mb-2 font-display text-2xl font-bold tracking-tight text-warm-900 dark:text-warm-100">
            {t('verifyGateHeading')}
          </h1>
          <p className="mb-6 text-sm text-warm-600 dark:text-warm-400">{t('verifyGateBody')}</p>
          <ResendVerificationForm initialEmail={session.user.email ?? ''} />
        </div>
      </section>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-warm-900 dark:text-warm-100">
          {t('emptyCartHeading')}
        </h1>
        <p className="mt-3 text-sm text-warm-600 dark:text-warm-400">
          {t('emptyCartBody')}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('browseCta')}
        </Link>
      </section>
    );
  }

  const [addressRows, paymentMethods, shippingSettings, storeSettings] = await Promise.all([
    prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    }),
    getCheckoutPaymentMethods(),
    getShippingSettings(),
    getStoreSettings(),
  ]);

  const savedAddresses: SavedAddress[] = addressRows.map((row) => ({
    id: row.id,
    title: row.title,
    fullName: row.fullName,
    phone: row.phone,
    addressLine: row.addressLine,
    ward: row.ward,
    district: row.district,
    city: row.city,
    country: row.country,
    isDefault: row.isDefault,
  }));

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance text-warm-900 dark:text-warm-100">
          {t('heading')}
        </h1>
        <p className="mt-2 text-sm text-warm-600 dark:text-warm-400">
          {t('subtitle')}
        </p>
      </header>
      <CheckoutForm
        cart={cart}
        paymentMethods={paymentMethods}
        shipping={{
          flatRateVnd: shippingSettings.flatRateVnd,
          freeShippingThresholdVnd: shippingSettings.freeShippingThresholdVnd,
          pickupAddress: shippingSettings.pickupAddress,
          pickupInstructions: shippingSettings.pickupInstructions,
          shipmentEnabled: shippingSettings.shipmentEnabled,
          pickupEnabled: shippingSettings.pickupEnabled,
          zones: shippingSettings.zones,
        }}
        tax={{
          taxEnabled: storeSettings.taxEnabled,
          taxRatePercent: storeSettings.taxRatePercent,
        }}
        checkoutNote={storeSettings.checkoutNote}
        savedAddresses={savedAddresses}
        defaultName={session.user.name ?? ''}
      />
    </section>
  );
}
```

Note: `requireEmail={isGuest}` is dropped (not passed → `CheckoutForm` defaults it to `false`); `components/checkout-form.tsx` itself is untouched (its now-unreachable `requireEmail` branch is intentionally left in place — see `DECISIONS.md`).

- [ ] **Step 10: Update translations — remove guest-checkout copy, add the verify-gate screen**

In `messages/en.json`, inside the `checkout` object, remove these three keys entirely:

```json
    "guestNotice": "You are checking out as a guest.",
    "guestLogin": "Sign in",
    "guestNoticeSuffix": "to save your addresses and track orders more easily.",
```

and add, in their place:

```json
    "verifyGateHeading": "Verify your email to continue",
    "verifyGateBody": "You need to verify your email address before completing checkout. We can resend the verification link below.",
```

In `messages/vi.json`, inside the `checkout` object, remove:

```json
    "guestNotice": "Bạn đang thanh toán với tư cách khách.",
    "guestLogin": "Đăng nhập",
    "guestNoticeSuffix": "để lưu địa chỉ và theo dõi đơn hàng dễ dàng hơn.",
```

and add, in their place:

```json
    "verifyGateHeading": "Xác minh email để tiếp tục",
    "verifyGateBody": "Bạn cần xác minh địa chỉ email trước khi hoàn tất thanh toán. Bạn có thể gửi lại liên kết xác minh bên dưới.",
```

- [ ] **Step 11: Run the full suite and typecheck**

Run: `node_modules/.bin/vitest run`
Expected: all tests pass, including the new `lib/__tests__/checkout-auth.test.ts` and `app/api/checkout/__tests__/route.test.ts`.

Run: `node_modules/.bin/tsc --noEmit`
Expected: no errors.

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/vi.json')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 12: Commit**

```bash
git add lib/checkout-auth.ts lib/__tests__/checkout-auth.test.ts app/api/checkout/__tests__/route.test.ts app/api/checkout/route.ts "app/[locale]/(storefront)/checkout/page.tsx" messages/en.json messages/vi.json
git commit -m "feat(checkout): require a verified email and drop guest checkout"
```

---

## Post-plan follow-ups (not part of this plan, flagged for a future task)

- `components/checkout-form.tsx`'s `requireEmail` prop and its guest email input field are unreachable after Task 8 (nothing passes `requireEmail={true}` anymore). Left in place per `DECISIONS.md`; a future standalone cleanup can remove `requireEmail` from `checkout-form.tsx` and the now-unused `customerInfo.email` field from `app/api/checkout/route.ts`'s request type.
