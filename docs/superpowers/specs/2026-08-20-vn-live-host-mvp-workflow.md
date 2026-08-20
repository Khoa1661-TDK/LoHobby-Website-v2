# VN Multi-Platform AI Live Host — MVP Workflow

Date: 2026-08-20
Status: Draft
Supersedes the platform ordering in `2026-08-20-shopee-live-ai-host-design.md`.
The pipeline design in that spec is unchanged; only the platform strategy and two
asset decisions change. Amendments listed in §7.

## 1. The organising fact

**Output is uniform. Input is not.** RTMP works the same on all four platforms.
Chat access differs so much that it should decide the build order — and it inverts
the Shopee-first plan.

| Platform | RTMP out | Chat in | Gate to go live | Verdict |
|---|---|---|---|---|
| **Facebook** | Official, Live Producer / Graph API, persistent key | **Official SSE live-comments push** + Graph comments edge | Page you admin. App review *not* needed in dev mode | **MVP target** |
| **TikTok** | Live Studio / OBS stream key | `TikTokLive` Python lib (unofficial WebCast WS, mature) | **1,000 followers** — check this first | Phase 2 |
| **Shopee** | `live.shopee.vn/pc` | Playwright on own console, DIY | None in VN | Phase 3 |
| **Lazada** | LazLive seller centre | Playwright on own console, DIY | Seller account | Phase 4 / drop |

Building Facebook first means the whole pipeline gets proven against an input that
is documented, stable, and free. Only after it works end-to-end do we take on
scraping, where every failure is ambiguous between "our bug" and "their DOM changed."

## 2. Two decisions that change the assets

### Shoot vertical, 1080×1920

Three of four platforms are 9:16 (TikTok, Shopee, Lazada). Facebook accepts both.
So vertical wins everywhere and one encode serves all four.

**This amends Stage 0 of the host spec**, which assumed a 16:9 720p frame. Generate
the Wan 2.2 clips at 720×1280 and compose to 1080×1920. Face target stays ~300-400px
so MuseTalk's 256×256 working resolution still lands well.

### An operator control panel replaces Shopee pin-detection

The host spec used Shopee's pinned-product DOM as the topic-change signal. That does
not generalise: Facebook has no product pin at all (Live Shopping was retired in
2022), and TikTok Shop's pin has no API.

Replace it with a **local web control panel** the seller keeps open on a second
monitor: a product list, click one, the host switches topic. Platform-independent,
simpler than DOM-watching, and it works on day one for every platform.

Shopee pin-detection becomes an optional convenience in Phase 3, not a dependency.
This is strictly better than the original design.

## 3. Fan-out: one encode, many destinations

Use the **`obs-multi-rtmp`** OBS plugin (free, open source). It pushes the same
encoded output to N RTMP endpoints directly from OBS. No restream server, no
nginx-rtmp, no MediaMTX, no paid service.

- Budget upload bandwidth: ~2.5 Mbps per destination. Four platforms ≈ 10 Mbps up.
  Vietnamese FTTH generally handles this; measure before relying on it.
- If upload is short, drop to 2 Mbps/1080×1920/30fps before dropping platforms.

## 4. Chat: do not merge platforms in v1

The tempting move is to pool comments from all four into one queue. Don't.

The host would answer a TikTok question in a way Shopee viewers never saw the setup
for, and vice versa — it reads as a host talking to someone off-screen. Worse, the
product context genuinely differs per platform (different listings, different prices,
different promos).

**The MVP model instead:**
- **One primary platform** supplies chat. The host talks to that room.
- **All other platforms receive the video broadcast-only.** Viewers there still get a
  fully functional shopping stream — they just aren't addressed by name.

This is not a compromise so much as how a human running four simulcasts behaves anyway.
Multi-room chat is a v2 problem and needs a per-platform context model to solve properly.

## 5. MVP scope

**In:**
- Facebook Live, vertical 1080×1920
- Official SSE comment ingest
- Operator control panel for product injection
- `director` + Qwen3 8B + VieNeu-TTS speech pipeline (unchanged from host spec)
- Comment classification and policy routing — kept, it is the safety layer and it is cheap
- Two-loop avatar (idle / talking) as the shipping path; MuseTalk lands on top

**Out of the MVP, deliberately:**
- TikTok, Shopee, Lazada ingest
- Multi-platform chat merging
- Shopee pin-detection
- B-roll auto-switching
- Any transaction handling

**On the avatar:** the host spec already defines "MuseTalk fails → fall back to the raw
loop" as the degraded path. The MVP ships *on that path first* and adds MuseTalk once
the stream is otherwise working. This is not cutting the lip-sync requirement — it is
sequencing it behind a working stream, so a MuseTalk integration problem never blocks
going live.

## 6. Phases

| Phase | Delivers | Exit criterion |
|---|---|---|
| **0** | Vertical loop footage + control panel + speech pipeline (fake feed) | Host talks convincingly about a product for 10 min, offline |
| **1 — MVP** | Facebook Live: SSE ingest, OBS, RTMP, two-loop avatar | One unattended 30-min stream, human on standby, no wrong prices |
| **2** | MuseTalk lip sync | Mouth tracks audio for a full stream without face-detection dropout |
| **3** | Fan-out via `obs-multi-rtmp` to TikTok + Shopee (broadcast-only) | All destinations live from one encode, upload stable |
| **4** | TikTok chat via `TikTokLive` as an alternate primary | Same host behaviour, different `Source` implementation |
| **5** | Shopee / Lazada Playwright ingest + Shopee pin-detection | Only if phases 1-4 show the format converts |

The `Source` interface from the host spec is what makes phases 4 and 5 cheap: each
platform is one new implementation emitting the same `CommentEvent` / `ProductEvent`,
and nothing downstream changes.

## 7. Amendments to the host spec

1. Platform order: Facebook first, Shopee demoted to phase 5.
2. Aspect ratio: vertical 1080×1920, not 16:9 720p. Affects Stage 0 generation.
3. Product injection: operator control panel is the primary mechanism; Shopee
   pin-detection is optional and late.
4. `ProductEvent` no longer originates from `ingest` — it comes from the control panel.
   `ingest` emits only `CommentEvent`. This simplifies every `Source` implementation.

## 8. Immediate checks before building

- **TikTok follower count.** LIVE access needs 1,000 followers. If the account is short,
  TikTok drops out of the plan entirely until it isn't — do not design around it.
- **Facebook Page + dev-mode app.** Confirm a Page exists and a dev-mode app can pull
  `/{live-video-id}/comments` with a Page token. This is the MVP's single dependency.
- **Upload bandwidth.** Measure sustained upload. It caps how many destinations are real.
- **MuseTalk weight licensing.** Still open from the host spec; blocks phase 2, not the MVP.
