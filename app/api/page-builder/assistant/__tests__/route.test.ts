// app/api/page-builder/assistant/__tests__/route.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// A shared holder the mocked OpenAI client reads scripted responses from.
const llm = vi.hoisted(() => ({ responses: [] as unknown[], calls: 0 }));

// Mock the heavy deps before importing the route.
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ auth: vi.fn() })) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/lib/page-builder/admin-guard', () => ({ isAuthorizedAdmin: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: async () => llm.responses[llm.calls++],
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
});
