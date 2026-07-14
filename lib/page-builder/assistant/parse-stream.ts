import type { Mutation } from './validate';
import type { Locale } from '@/i18n/routing';

export type AssistantEvent =
  | { type: 'mutation'; mutation: Mutation; locales: Locale[] }
  // Incremental text delta from the model's reply, emitted as it streams in. Purely
  // additive/optional — a `summary` still arrives at the end with the authoritative full
  // text, so a consumer that ignores `token` entirely still works exactly as before.
  | { type: 'token'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done' };

export async function* parseAssistantStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AssistantEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as AssistantEvent;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as AssistantEvent;
}
