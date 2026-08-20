# Shopee Live AI Host — Design

Date: 2026-08-20
Status: Draft (design), pending approval

## 1. Goal

A synthetic livestream host that broadcasts to Shopee Live, speaks Vietnamese, reacts to
viewer comments, and pitches whichever product the human seller pins on screen.

Runs entirely on local hardware. No paid APIs, no cloud inference, no per-minute cost.

### Non-goals

- **Not autonomous.** A human seller opens the stream, pins products, and can cut it at any
  time. The host is a mouth, not a director.
- **No changes to Ecommerce-Web.** The host is a separate Python service living in its own
  repository (`~/Desktop/lohobby-live-host`). It reads product data over Payload's existing
  REST API with a read-only API key. Zero new collections, fields, or migrations here. This
  spec lives in this repo only because that is where the spec convention lives.
- **No transactions.** The host talks; Shopee handles carts, checkout, and payment.
- **No real-time full-head generation** from a still image (SadTalker / Hallo / EchoMimic
  class). Rejected in §10.
- **Vietnamese only.** No multilingual host.

## 2. Constraints

### Hardware budget

| Device | Job | Load |
|---|---|---|
| RTX 5060 Ti, 16GB | Qwen3 8B Q6 (headroom for 14B Q4) | ~7GB |
| RTX 3080 Ti, 12GB | MuseTalk 1.5 | ~4GB |
| CPU / 30GB RAM | VieNeu-TTS v3 Turbo via ONNX Runtime | 0 VRAM |
| — | Wan 2.2 video generation | Offline only, Stage 0, not during a stream |

Video generation never runs concurrently with a live stream. Stage 0 is an offline
asset-production step.

### Licensing — this is a commercial sales channel

Everything in the runtime path must permit commercial use. This eliminated the obvious
choices, so the reasoning is recorded here rather than rediscovered later.

| Component | License | Verdict |
|---|---|---|
| VieNeu-TTS v3 Turbo | Apache 2.0, code and weights | **Use.** VN voice cloning from 3-5s |
| Piper VN | MIT | **Use as failover.** No cloning, robotic, safe |
| Mozilla Common Voice VN | CC0 | **Use as the voice reference sample** |
| MuseTalk (code) | MIT | Use — but audit weight dependencies, see below |
| Wan 2.2 | Apache 2.0 | Use (offline asset generation) |
| Qwen3 8B | Apache 2.0 | Use |
| ~~viXTTS / XTTS-v2~~ | Coqui Public Model License — **non-commercial** | **Rejected.** Coqui shut down Jan 2024; no commercial license can be purchased from anyone |
| ~~VietTTS (dangvansam)~~ | Apache code, **CC BY-NC weights** | **Rejected** |
| ~~F5-TTS~~ | CC-BY-NC base weights | **Rejected** |
| ~~Wav2Lip~~ | Research / non-commercial | **Rejected** |

**Open action:** MuseTalk's code is MIT, but it pulls `sd-vae-ft-mse` (CreativeML Open
RAIL-M) and dwpose (Apache 2.0). Confirm the RAIL-M use-restrictions are compatible before
first commercial broadcast. If not, LatentSync is the fallback with a pre-render architecture.

### Platform

- **Output is solved.** `live.shopee.vn/pc/LOGIN` issues an RTMP server URL and stream key
  for OBS. No follower gate in VN (the 10k-follower requirement appears only in MY/SG docs).
- **Input is not.** Shopee publishes no live-chat API. The only route is the seller's own
  logged-in PC console, driven by Playwright. This is the most fragile component in the
  system and is deliberately built last, behind an interface.

## 3. Architecture

```
live.shopee.vn/pc ──Playwright──┬──> comment events ────┐
  (seller's own session)        │                       ├──> director
                                └──> pinned product ────┘      │
                                     (item id, name, price)    │
                                                               ▼
   Payload REST ──> product facts (specs, description)      llm (Qwen3 8B)
   join: variant sku LIKE 'sp-<shopeeId>-'                     │
                                                               ▼
                                              normalize ──> tts (VieNeu-TTS)
                                                               │
                                                               ▼
                            loop footage ──> avatar (MuseTalk) ──> v4l2loopback cam
                                                               └──> null audio sink
                                                                        │
                                                          OBS ──RTMP──> Shopee Live
```

The seller directs; the host narrates. A pin change is the topic-change signal.

## 4. Components

Each is a separate module with one job, a narrow interface, and independent tests.

### `ingest` — Shopee console adapter
Owns Playwright. Watches the comment panel and the pinned-product state. Emits two event
types onto a queue and knows nothing else about the system.

```
CommentEvent  { id, author, text, ts }
ProductEvent  { shopeeItemId, name, priceRaw, discountRaw, ts }
```

Behind a `Source` interface with two implementations: `ShopeeSource` and `FakeSource`
(scripted events from a JSON file). Stages 1 and 2 develop entirely against `FakeSource`.

### `catalog` — fact lookup
Given a `shopeeItemId`, returns a `ProductFacts` record. Joins to Payload by querying
ProductVariants for `sku LIKE 'sp-<shopeeItemId>-'` — the key already used by
`scripts/import-shopee-prices.ts:53`.

**Grounding rule, non-negotiable:**
- **Numbers come from the DOM.** Price, discount, stock badge — read off the console's
  pinned-product card. That is the live Shopee price, the one the buyer sees. It cannot
  drift from reality because it *is* reality.
- **Prose comes from Payload.** Specs, material, layer height, print time, description.
- **No Payload match → degraded mode.** The host speaks only the name and price visible on
  screen and states no specs. It never invents.

### `director` — scheduler and policy
The core of the system. Holds a priority queue and decides what the host says next.

- Product pin change preempts, but **only at a sentence boundary**, then speaks a
  transition line. A hard cut mid-sentence is the single most obvious bot tell.
- Comments interrupt the pitch, get answered, then the pitch resumes at its next angle.
- When nothing is happening, walks an **idle rotation** for the current product:
  what it is → who it's for → the print/material detail → call to action → back to start,
  varied. This is what lets the host talk for ten minutes about one item.
- Classifies each comment and selects a **policy**, not a canned reply. Every path still
  goes through the LLM and comes out as natural speech:

| Class | Facts given | Rules |
|---|---|---|
| Product question | Full `ProductFacts` | Answer freely |
| Greeting / hype | None | Respond warmly, no product claims |
| Discount / delivery date / complaint | None | Deflect to DM naturally, never commit |
| Troll / off-topic | — | Silently dropped; host keeps talking |

The deflect path is not a compromise on naturalness. A real Vietnamese host also refuses to
promise a discount on air.

### `llm` — Qwen3 8B, streaming
Served by llama.cpp on the 5060 Ti behind an OpenAI-compatible endpoint, matching the
existing local-model setup. Reasoning must be disabled per request via
`chat_template_kwargs` — the Qwen template bills reasoning to `max_tokens` and otherwise
returns empty content with `finish_reason: length`, which on a livestream is dead air.

System prompt enforces **spoken register, not written Vietnamese** (particles: nha, nhé, á,
luôn; mình / bạn / shop) and **speakable output only** — no markdown, no lists, no emoji,
short sentences. Streams sentence-by-sentence so TTS can start before generation finishes.

### `normalize` — Vietnamese text normalization
Sits between LLM and TTS. Not a detail — a required deliverable.

- Digits to words: `290.000₫` → `hai trăm chín mươi nghìn đồng`. Without this the price is
  read wrong or dropped, on a sales channel.
- Units: `0.2mm` → `không phẩy hai mi-li-mét`
- A pronunciation lexicon for domain terms: PLA, PETG, TPU, filament, layer, infill
- Strips anything unspeakable that leaked through

### `tts` — VieNeu-TTS v3 Turbo
ONNX Runtime on CPU, real-time, zero VRAM. Voice cloned from a 3-5s CC0 Common Voice
Vietnamese clip. Piper VN failover: a robotic sentence beats dead air.

**Reference-clip selection matters.** Common Voice is read-aloud speech, and a read-aloud
reference produces a read-aloud host regardless of the text. Audition clips and pick the
most conversational speaker.

### `avatar` — MuseTalk 1.5
Pre-computes face crops, landmarks, and VAE latents for **every frame of the loop once at
startup**. At runtime only the UNet on the mouth region plus a decode. This caching is the
entire reason MuseTalk hits real-time where Hallo cannot.

Outputs to a v4l2loopback virtual camera; audio to a PulseAudio null sink. OBS consumes
both as ordinary sources, which cleanly decouples the host from distribution.

### `overlay` — OBS browser source
A local HTTP endpoint the OBS browser-source polls, serving the current product card. Driven
by the same `director` state, so the on-screen card can never disagree with what the host is
saying.

## 5. Naturalness requirements

Naturalness lives in the director's timing, not the model's prose. These are testable
requirements, not aspirations.

1. **Never dead air.** Something is always queued. The single biggest tell.
2. **Do not answer every comment.** Real hosts miss comments. Sample, don't sweep.
3. **Deliberate latency.** A 1-2s beat before answering. Zero latency reads as machine.
4. **Address by name.** "Bạn Linh hỏi…" — worth more than a model upgrade.
5. **Batch similar questions.** "Mấy bạn hỏi giá nè…" reads as attention to the room.
6. **Never restate the question.** Bots say "Bạn hỏi về giá. Giá là…" Humans just answer.
7. **Vary sentence length.** Let short fragments through. Uniform cadence sounds synthetic.

## 6. Failure modes — the host must never freeze

A frozen frame on a live sales channel is worse than a wrong word. Every failure degrades
toward "still looks alive."

| Failure | Response |
|---|---|
| LLM stalls or times out | Canned filler line, already normalized and cached |
| TTS fails | Retry once on Piper, then skip the utterance |
| MuseTalk crashes | OBS falls back to the raw loop scene — still a person sitting there |
| Playwright loses the console | Host keeps pitching the last known product; alert the seller |
| No Payload match | Degraded mode: name and price only, no specs |
| Comment flood | Rate-limit, batch, and drop the tail |

A watchdog supervises each subprocess and restarts it. Stream continuity outranks
correctness of any single utterance.

## 7. Build stages

| Stage | Delivers | Depends on |
|---|---|---|
| **0. Footage** | 10-12 Wan 2.2 I2V clips from the existing portrait, ping-ponged into seamless loops, plus B-roll. Preflight face-detection script. | Portrait (have it) |
| **1. Speech** | `director` + `llm` + `normalize` + `tts` → audio, driven by `FakeSource` | — |
| **2. Avatar** | `avatar` + virtual cam/audio sink, fed by Stage 1 | 0, 1 |
| **3. Shopee** | `ingest` (real), `catalog`, `overlay`, OBS scene, RTMP | 2 |

Stage 1 is the real risk: does it sound like a competent Vietnamese host? That is answerable
with zero Shopee involvement and no avatar, which is why it comes first.

### Stage 0 detail

Do **not** generate one long video. Video models drift; over a long generation the face
subtly morphs, which looks bad and breaks MuseTalk's face tracking.

- One Flux portrait is the identity anchor for all clips (already have it)
- Wan 2.2 **TI2V 5B** first, not the 14B. The shot is a person sitting still — the easiest
  case a video model gets. The 14B's advantage is complex motion, which is unwanted here.
- 10-12 clips of 5s → ping-pong → cut between them. ~2 min of drift-free footage.
- Negative prompt `talking, speaking, open mouth, mouth movement` — the mouth is being
  replaced; a moving source mouth fights the inpaint.
- Medium shot, face ~300px in a 720p frame, matching MuseTalk's 256×256 working resolution.
- Front-facing, stable lighting, no hands crossing the face, plain background.
- **Preflight:** run the face detector over every frame, reject clips where detection drops
  or the bbox jumps. Ten minutes of scripting; saves discovering it live.

## 8. Testing

- `normalize` — pure function, table-driven. Prices, units, lexicon terms. Highest-value
  tests in the system; a wrong price is the worst thing this host can do.
- `director` — fed scripted event sequences, asserted on the utterance queue. Covers
  preemption at sentence boundaries, idle rotation advance, policy routing, rate limiting.
- `catalog` — the `sp-<id>-` join against a fixture DB, including the no-match degraded path.
- `ingest` — `FakeSource` for everything upstream; `ShopeeSource` gets a recorded-DOM
  fixture test that will fail loudly when Shopee reskins the page.
- **Rehearsal mode** — the whole pipeline to a local window with a scripted comment feed.
  Every change is exercised end-to-end before anything reaches Shopee.

## 9. Risks

1. **Shopee DOM changes break ingest.** Mitigated by the `Source` interface, the fixture
   test, and degraded-mode operation. Accepted; it is inherent to having no API.
2. **Shopee's policy on unattended synthetic hosts is unsettled.** VN sellers run AI
   livestreams widely and Shopee ships its own AI host features, but this is a business risk
   the operator accepts, not one engineering can remove. A human should be on standby for
   the first runs.
3. **Uncanny valley / AI-host trust.** Vietnamese viewers have gotten good at spotting AI
   hosts and can read them as low-trust. Watch conversion against a human-hosted baseline.
4. **The host says something wrong.** Mitigated structurally: numbers are templated from the
   DOM, never generated; the deflect policy blocks commitments; the seller can cut the stream.

## 10. Rejected alternatives

- **SadTalker / Hallo / EchoMimic** (full head from a still) — ~0.1× realtime. A 3-hour
  stream needs 30 hours of rendering. Not viable on any consumer hardware.
- **No lip sync at all** (two loops, idle + talking, switched on an audio flag) — genuinely
  cheaper and considered seriously, but the operator wants lip sync and MuseTalk delivers it
  in real time, so the trade never had to be made.
- **LatentSync 1.6** — better quality than MuseTalk but ~0.3-1× realtime. Held in reserve as
  the fallback if MuseTalk's weight licensing fails audit, which would force a
  buffered pre-render architecture.
- **Wav2Lip** — fast, but non-commercial license.
- **A scripted run sheet** driving the product order — replaced by seller-pin-driven events.
  The human pinning products is simultaneously the topic signal and the circuit breaker.
- **Filming a real person** — strictly better MuseTalk input, but the operator declines to
  be on camera. Moot.
