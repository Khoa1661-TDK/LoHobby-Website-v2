import { describe, expect, it } from 'vitest';
import { buildLogger, createRequestLogger } from '@/lib/logger';

function captureStream() {
  const lines: string[] = [];
  return {
    lines,
    stream: { write: (chunk: string) => lines.push(chunk) },
  };
}

describe('logger', () => {
  it('should emit a single valid JSON line with required fields', () => {
    const { lines, stream } = captureStream();
    const log = buildLogger(stream);

    log.info('order created');

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!);
    expect(entry.message).toBe('order created');
    expect(entry.level).toBe('info');
    expect(typeof entry.timestamp).toBe('string');
    // ISO 8601 timestamp
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('should stamp request-scoped context on every line', () => {
    const { lines, stream } = captureStream();
    // child loggers share the base logger; verify context merges into output.
    const child = buildLogger(stream).child({
      request_id: 'req-123',
      route: '/api/checkout',
    });

    child.error({ duration_ms: 42 }, 'gateway error');

    const entry = JSON.parse(lines[0]!);
    expect(entry.request_id).toBe('req-123');
    expect(entry.route).toBe('/api/checkout');
    expect(entry.duration_ms).toBe(42);
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('gateway error');
  });

  it('should expose createRequestLogger returning a usable child logger', () => {
    const log = createRequestLogger({ request_id: 'abc' });
    expect(typeof log.info).toBe('function');
  });
});
