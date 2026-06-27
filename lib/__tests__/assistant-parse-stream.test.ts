import { describe, expect, it } from 'vitest';
import { parseAssistantStream } from '@/lib/page-builder/assistant/parse-stream';

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
}

describe('parseAssistantStream', () => {
  it('should yield events split across chunk boundaries', async () => {
    const body = streamFrom([
      '{"type":"mutation","mutation":{"kind":"remove","index":0}}\n{"type":"sum',
      'mary","text":"done"}\n{"type":"done"}\n',
    ]);
    const events = [];
    for await (const e of parseAssistantStream(body)) events.push(e);
    expect(events.map((e) => e.type)).toEqual(['mutation', 'summary', 'done']);
  });
});
