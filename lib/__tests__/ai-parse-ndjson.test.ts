import { describe, expect, it } from 'vitest';
import { parseNdjsonStream } from '@/lib/ai/parse-ndjson';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect<T>(stream: ReadableStream<Uint8Array>): Promise<T[]> {
  const out: T[] = [];
  for await (const event of parseNdjsonStream<T>(stream)) out.push(event);
  return out;
}

describe('parseNdjsonStream', () => {
  it('should yield one object per line', async () => {
    const events = await collect(streamOf(['{"a":1}\n{"a":2}\n']));
    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('should reassemble an object split across chunks', async () => {
    const events = await collect(streamOf(['{"a":', '1}\n']));
    expect(events).toEqual([{ a: 1 }]);
  });

  it('should yield a trailing line with no newline', async () => {
    const events = await collect(streamOf(['{"a":1}']));
    expect(events).toEqual([{ a: 1 }]);
  });

  it('should skip blank lines', async () => {
    const events = await collect(streamOf(['{"a":1}\n\n{"a":2}\n']));
    expect(events).toEqual([{ a: 1 }, { a: 2 }]);
  });
});
