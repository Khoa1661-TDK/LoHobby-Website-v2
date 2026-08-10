import type { Mutation } from './validate';
import type { Locale } from '@/i18n/routing';
import { parseNdjsonStream } from '@/lib/ai/parse-ndjson';

export type AssistantEvent =
  | { type: 'mutation'; mutation: Mutation; locales: Locale[] }
  // Incremental text delta from the model's reply, emitted as it streams in. Purely
  // additive/optional — a `summary` still arrives at the end with the authoritative full
  // text, so a consumer that ignores `token` entirely still works exactly as before.
  | { type: 'token'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done' };

export function parseAssistantStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AssistantEvent> {
  return parseNdjsonStream<AssistantEvent>(body);
}
