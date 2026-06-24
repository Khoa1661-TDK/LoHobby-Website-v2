import { describe, expect, it, vi } from 'vitest';
import { translateTextMap, type TranslateClient } from '@/lib/page-builder/mirror/translate';

function mockClient(content: string | null): TranslateClient {
  return {
    chat: {
      completions: {
        create: vi.fn(async () => ({ choices: [{ message: { content } }] })),
      },
    },
  };
}

describe('translateTextMap', () => {
  it('should return translated values keyed by the same paths', async () => {
    const client = mockClient(JSON.stringify({ heading: 'Hola', 'items.0.question': '¿Q?' }));
    const out = await translateTextMap(
      [{ path: 'heading', value: 'Hello' }, { path: 'items.0.question', value: 'Q?' }],
      'en',
      'vi',
      client,
    );
    expect(out.heading).toBe('Hola');
    expect(out['items.0.question']).toBe('¿Q?');
  });

  it('should fall back to source text for any path the model omitted', async () => {
    const client = mockClient(JSON.stringify({ heading: 'Hola' }));
    const out = await translateTextMap(
      [{ path: 'heading', value: 'Hello' }, { path: 'subhead', value: 'World' }],
      'en',
      'vi',
      client,
    );
    expect(out.heading).toBe('Hola');
    expect(out.subhead).toBe('World'); // source fallback
  });

  it('should return source map unchanged when the response is unparseable', async () => {
    const client = mockClient('sorry, I cannot do that');
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', client);
    expect(out.heading).toBe('Hello');
  });

  it('should return source map unchanged when the API throws', async () => {
    const client: TranslateClient = {
      chat: { completions: { create: vi.fn(async () => { throw new Error('429'); }) } },
    };
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', client);
    expect(out.heading).toBe('Hello');
  });

  it('should return source map unchanged when no client is provided (no API key)', async () => {
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', null);
    expect(out.heading).toBe('Hello');
  });

  it('should return an empty map for empty input', async () => {
    const out = await translateTextMap([], 'en', 'vi', mockClient('{}'));
    expect(out).toEqual({});
  });

  it('should tolerate JSON wrapped in surrounding prose', async () => {
    const client = mockClient(`Sure! Here you go: {"heading":"Hola"} thanks!`);
    const out = await translateTextMap([{ path: 'heading', value: 'Hello' }], 'en', 'vi', client);
    expect(out.heading).toBe('Hola');
  });
});