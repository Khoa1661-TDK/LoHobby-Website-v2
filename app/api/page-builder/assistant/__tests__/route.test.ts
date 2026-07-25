// app/api/page-builder/assistant/__tests__/route.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// A shared holder the mocked OpenAI client reads scripted responses from.
// `seenMessages` records the `messages` array passed to each create() call so tests can
// assert what the route fed the model on follow-up turns (e.g. the echoed layout).
const llm = vi.hoisted(() => ({ responses: [] as unknown[], calls: 0, seenMessages: [] as unknown[][] }));
// Shared `payload.find` stub so search_media/search_catalog tests can script Payload's
// response and assert exactly what collection/where/limit the route passed through.
const payloadMock = vi.hoisted(() => ({
  auth: vi.fn(),
  find: vi.fn(async () => ({ docs: [] as unknown[] })),
}));

// Mock the heavy deps before importing the route.
vi.mock('payload', () => ({ getPayload: vi.fn(async () => payloadMock) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/page-builder/admin-guard', () => ({ isAuthorizedAdmin: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async (args: { messages?: unknown[] }) => {
          llm.seenMessages.push((args?.messages ?? []) as unknown[]);
          return llm.responses[llm.calls++];
        },
      },
    };
  },
}));

import { POST } from '../route';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';
import type { AssistantEvent } from '@/lib/page-builder/assistant/parse-stream';

function toolCall(id: string, name: string, args: unknown) {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}
function assistantTurn(toolCalls: unknown[], content: string | null = null) {
  return { choices: [{ message: { role: 'assistant', content, tool_calls: toolCalls } }] };
}
function finalTurn(text: string) {
  return { choices: [{ message: { role: 'assistant', content: text, tool_calls: [] } }] };
}

async function readEvents(res: Response): Promise<AssistantEvent[]> {
  const text = await res.text();
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as AssistantEvent);
}

function req(body: unknown): Request {
  return new Request('http://localhost/api/page-builder/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/page-builder/assistant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should 401 when the caller is not an admin', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await POST(req({ prompt: 'hi', layout: [], locale: 'en' }));
    expect(res.status).toBe(401);
  });

  it('should 400 when prompt is missing', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(req({ layout: [], locale: 'en' }));
    expect(res.status).toBe(400);
  });

  it('should 400 when neither prompt nor a valid image is provided', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    // An empty prompt plus a non-image data URL leaves nothing to act on.
    const res = await POST(req({ prompt: '   ', layout: [], locale: 'en', images: ['not-a-data-url'] }));
    expect(res.status).toBe(400);
  });

  it('should accept an image-only request (no prompt) past the 400 gate', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const prev = process.env.ASSISTANT_LLM_API_KEY;
    // Force the next gate (missing key → 500) so we prove the image-only request cleared
    // the 400 prompt/image check without needing a live LLM.
    delete process.env.ASSISTANT_LLM_API_KEY;
    try {
      const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const res = await POST(req({ prompt: '', layout: [], locale: 'en', images: [tinyPng] }));
      expect(res.status).toBe(500);
    } finally {
      if (prev !== undefined) process.env.ASSISTANT_LLM_API_KEY = prev;
    }
  });

  it('should 500 when the assistant LLM key is not configured', async () => {
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const prev = process.env.ASSISTANT_LLM_API_KEY;
    delete process.env.ASSISTANT_LLM_API_KEY;
    try {
      const res = await POST(req({ prompt: 'hi', layout: [], locale: 'en' }));
      expect(res.status).toBe(500);
    } finally {
      if (prev !== undefined) process.env.ASSISTANT_LLM_API_KEY = prev;
    }
  });
});

describe('POST /api/page-builder/assistant — dual-locale mutation stream', () => {
  const prevKey = process.env.ASSISTANT_LLM_API_KEY;
  beforeEach(() => {
    vi.clearAllMocks();
    llm.responses = [];
    llm.calls = 0;
    llm.seenMessages = [];
    process.env.ASSISTANT_LLM_API_KEY = 'test-key';
    (isAuthorizedAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });
  afterEach(() => {
    if (prevKey === undefined) delete process.env.ASSISTANT_LLM_API_KEY;
    else process.env.ASSISTANT_LLM_API_KEY = prevKey;
  });

  it('should tag an add mutation with both locales, inject a shared blockKey, and carry blockOther', async () => {
    llm.responses = [
      assistantTurn([
        toolCall('c1', 'add_block', {
          blockType: 'hero',
          index: 0,
          fields: { headline: 'Xin chào' },
          fieldsOther: { headline: 'Hello' },
        }),
      ]),
      finalTurn('Added a hero.'),
    ];

    const res = await POST(
      req({ prompt: 'add a hero', layouts: { vi: [], en: [] }, activeLocale: 'vi' }),
    );
    const events = await readEvents(res);
    const add = events.find((e) => e.type === 'mutation');
    expect(add && add.type === 'mutation').toBe(true);
    if (add && add.type === 'mutation') {
      expect(add.locales.sort()).toEqual(['en', 'vi']);
      expect(add.mutation.kind).toBe('add');
      if (add.mutation.kind === 'add') {
        const key = (add.mutation.block as { blockKey?: string }).blockKey;
        expect(typeof key).toBe('string');
        expect(key).toBeTruthy();
        expect((add.mutation.blockOther as { blockKey?: string }).blockKey).toBe(key);
        expect((add.mutation.block as { headline?: string }).headline).toBe('Xin chào');
        expect((add.mutation.blockOther as { headline?: string }).headline).toBe('Hello');
      }
    }
  });

  it('should tag a per-locale update with only the targeted locale', async () => {
    llm.responses = [
      assistantTurn([
        toolCall('c1', 'add_block', { blockType: 'hero', index: 0, fields: { headline: 'A' } }),
      ]),
      assistantTurn([
        toolCall('c2', 'update_block', { index: 0, fields: { headline: 'B' }, locale: 'en' }),
      ]),
      finalTurn('Updated the en hero.'),
    ];

    const res = await POST(
      req({ prompt: 'edit en', layouts: { vi: [], en: [] }, activeLocale: 'vi' }),
    );
    const events = await readEvents(res);
    const mutations = events.filter((e) => e.type === 'mutation');
    expect(mutations).toHaveLength(2);
    const update = mutations[1];
    if (update && update.type === 'mutation') {
      expect(update.mutation.kind).toBe('update');
      expect(update.locales).toEqual(['en']);
    }
  });

  it('should echo the post-mutation layout back to the model on the next turn (index-drift fix)', async () => {
    // Start with a hero at index 0. The model inserts a marquee at the top; the hero must now
    // appear at index 1 in what the model sees on its second turn — otherwise it would keep
    // targeting the stale index 0 and mangle the wrong block.
    llm.responses = [
      assistantTurn([
        toolCall('c1', 'add_block', { blockType: 'marquee', index: 0, fields: {} }),
      ]),
      finalTurn('Added a marquee at the top.'),
    ];

    const res = await POST(
      req({
        prompt: 'add a marquee on top',
        layouts: {
          vi: [{ blockType: 'hero', blockKey: 'hero-1' }],
          en: [{ blockType: 'hero', blockKey: 'hero-1' }],
        },
        activeLocale: 'vi',
      }),
    );
    await readEvents(res); // drain the stream so the loop completes

    // The second create() call is the follow-up turn. Its message list must contain a tool
    // result echoing the shifted layout: marquee at 0, hero at 1.
    const followUp = llm.seenMessages[1];
    expect(followUp).toBeTruthy();
    const toolMsg = (followUp ?? []).find(
      (m): m is { role: string; content: string } =>
        !!m && typeof m === 'object' && (m as { role?: string }).role === 'tool',
    );
    expect(toolMsg).toBeTruthy();
    const content = toolMsg!.content;
    const viJson = content.slice(content.indexOf('[vi]') + '[vi]\n'.length).split('\n[en]')[0] ?? '';
    const snapshot = JSON.parse(viJson) as Array<{ index: number; blockType: string }>;
    expect(snapshot.map((b) => b.blockType)).toEqual(['marquee', 'hero']);
    expect(snapshot[1]).toMatchObject({ index: 1, blockType: 'hero' });
  });

  it('should keep structural mutations tagged for both locales across move and remove', async () => {
    llm.responses = [
      assistantTurn([
        toolCall('c1', 'add_block', { blockType: 'hero', index: 0, fields: {} }),
        toolCall('c2', 'add_block', { blockType: 'faq', index: 1, fields: {} }),
        toolCall('c3', 'move_block', { from: 1, to: 0 }),
        toolCall('c4', 'remove_block', { index: 1 }),
      ]),
      finalTurn('Rearranged.'),
    ];

    const res = await POST(
      req({ prompt: 'shuffle', layouts: { vi: [], en: [] }, activeLocale: 'en' }),
    );
    const events = await readEvents(res);
    const mutations = events.filter((e) => e.type === 'mutation');
    expect(mutations).toHaveLength(4);
    for (const m of mutations) {
      if (m.type === 'mutation') expect(m.locales.slice().sort()).toEqual(['en', 'vi']);
    }
  });

  it('should answer describe_block as a tool message without emitting a mutation', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    llm.responses = [
      assistantTurn([toolCall('c1', 'describe_block', { blockType: 'faq' })]),
      finalTurn('Described the FAQ block.'),
    ];

    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'what fields does faq have', layouts: { vi: [], en: [] } }),
      }),
    );
    const events = await readEvents(res);

    expect(events.some((e) => e.type === 'mutation')).toBe(false);
    const toolMessage = llm.seenMessages.at(-1)?.find(
      (m) => (m as { role?: string }).role === 'tool',
    ) as { content?: string } | undefined;
    expect(toolMessage?.content).toContain('items: array of rows, each:');
  });

  it('should still be running the tool loop on turn 20, past the old 16-turn cap', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    // 20 read-only turns followed by a final answer. Under the old MAX_TURNS = 16 the loop
    // would stop after the 16th completion call and never reach the final turn, so llm.calls
    // would be 16 and no summary event would ever be emitted.
    const TURNS = 20;
    llm.responses = [
      ...Array.from({ length: TURNS }, (_, i) =>
        assistantTurn([toolCall(`c${i}`, 'describe_block', { blockType: 'faq' })]),
      ),
      finalTurn('Done after a long tool loop.'),
    ];

    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'describe faq 20 times', layouts: { vi: [], en: [] } }),
      }),
    );
    const events = await readEvents(res);

    expect(llm.calls).toBe(TURNS + 1);
    expect(events.some((e) => e.type === 'summary' && e.text === 'Done after a long tool loop.')).toBe(true);
  });

  it('should answer search_media as a tool message reflecting the search result, without emitting a mutation', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    payloadMock.find.mockResolvedValueOnce({
      docs: [{ id: 412, filename: 'bambu-a1-mini.jpg', alt: 'Bambu A1 Mini on desk', width: 1600, height: 1067 }],
    });
    llm.responses = [
      assistantTurn([toolCall('c1', 'search_media', { query: 'bambu', limit: 5 })]),
      finalTurn('Found a media match.'),
    ];

    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'find a bambu image', layouts: { vi: [], en: [] } }),
      }),
    );
    const events = await readEvents(res);

    // Read-only: no mutation emitted.
    expect(events.some((e) => e.type === 'mutation')).toBe(false);
    // Wiring: the route called `payload.find` on the `media` collection with the model's
    // query mapped into a filename/alt `like` search and the requested limit.
    expect(payloadMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        limit: 5,
        where: { or: [{ filename: { like: 'bambu' } }, { alt: { like: 'bambu' } }] },
      }),
    );
    // The tool message pushed back to the model reflects the actual search result.
    const toolMessage = llm.seenMessages.at(-1)?.find(
      (m) => (m as { role?: string }).role === 'tool',
    ) as { content?: string } | undefined;
    expect(JSON.parse(toolMessage?.content ?? '[]')).toEqual([
      { id: 412, filename: 'bambu-a1-mini.jpg', alt: 'Bambu A1 Mini on desk', width: 1600, height: 1067 },
    ]);
    // The loop continued past the tool call to get the model's final reply, rather than
    // terminating the turn on the read-only branch.
    expect(llm.calls).toBe(2);
    expect(events.some((e) => e.type === 'summary' && e.text === 'Found a media match.')).toBe(true);
  });

  it('should answer search_catalog as a tool message reflecting the search result, without emitting a mutation', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    payloadMock.find.mockResolvedValueOnce({
      docs: [{ id: 7, title: 'Filament PLA' }],
    });
    llm.responses = [
      assistantTurn([toolCall('c1', 'search_catalog', { collection: 'products', query: 'pla', limit: 5 })]),
      finalTurn('Found a product match.'),
    ];

    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'find a pla product',
          layouts: { vi: [], en: [] },
          activeLocale: 'en',
        }),
      }),
    );
    const events = await readEvents(res);

    // Read-only: no mutation emitted.
    expect(events.some((e) => e.type === 'mutation')).toBe(false);
    // Wiring: collection, query→where mapping, limit, and activeLocale all land correctly in
    // the searchCatalog(payload, collection, query, limit, locale) call.
    expect(payloadMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'products',
        limit: 5,
        locale: 'en',
        where: { title: { like: 'pla' } },
      }),
    );
    // The tool message pushed back to the model reflects the actual search result.
    const toolMessage = llm.seenMessages.at(-1)?.find(
      (m) => (m as { role?: string }).role === 'tool',
    ) as { content?: string } | undefined;
    expect(JSON.parse(toolMessage?.content ?? '[]')).toEqual([{ id: 7, title: 'Filament PLA' }]);
    // The loop continued past the tool call to get the model's final reply, rather than
    // terminating the turn on the read-only branch.
    expect(llm.calls).toBe(2);
    expect(events.some((e) => e.type === 'summary' && e.text === 'Found a product match.')).toBe(true);
  });

  it('should reject a row index past the end instead of silently no-opping', async () => {
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true);
    llm.responses = [
      assistantTurn([toolCall('c1', 'remove_row', { index: 0, field: 'items', rowIndex: 4 })]),
      finalTurn('Could not remove that row.'),
    ];

    const layouts = { vi: [{ blockType: 'faq', items: [{ question: 'A' }] }], en: [{ blockType: 'faq', items: [{ question: 'A' }] }] };
    const res = await POST(
      new Request('http://x/api/page-builder/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'remove the fifth faq', layouts }),
      }),
    );
    const events = await readEvents(res);

    expect(events.some((e) => e.type === 'mutation')).toBe(false);
    const error = events.find((e) => e.type === 'error') as { error?: string } | undefined;
    expect(error?.error).toMatch(/has 1 rows/);
  });
});
