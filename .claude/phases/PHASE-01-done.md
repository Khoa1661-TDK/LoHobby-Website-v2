# Phase 01 — Analytics Capture + Storage
Status: DONE

## Goal
Record traffic attribution (visit sessions) and product-view dwell events into Prisma, consent-gated and pseudonymous.

## Tasks
- [x] Add `VisitSession` and `ProductViewEvent` Prisma models + migration
- [x] Client capture helpers `lib/analytics/track-client.ts` (anon/session id, `classifySource`, consent-gated beacon)
- [x] `components/analytics/session-tracker.tsx` mounted in storefront layout
- [x] `components/analytics/product-view-tracker.tsx` mounted on product page (dwell via visibility/pagehide)
- [x] `POST /api/track/session` and `POST /api/track/view` (Node, manual validation, consent + dwell cap)

## Acceptance Criteria
- [x] Visiting with `utm_*` / referrer / direct writes a `VisitSession` with correct `source` (logic in place; runtime verify in Phase 03)
- [x] Viewing a product writes a `ProductViewEvent` with plausible `dwellMs`
- [x] No rows written when analytics consent is absent (client beacon + server cookie check)
- [x] `customerId` attached server-side from session, never from client body

## Decisions Made This Phase
- Manual `typeof` validation (codebase idiom, e.g. `app/api/register/route.ts`) instead of adding zod.
- Tracking routes given a dedicated `track` rate-limit bucket (120/min) so beacons don't starve the functional `/api` budget on shared IPs. (Deviation from plan — middleware + rate-limit presets touched; logged in DECISIONS.md context.)
- Both routes return 204 on every path (bad input, no consent) so telemetry never surfaces errors or validation internals.
