import 'server-only';
import pino, { type DestinationStream, type Logger } from 'pino';

/**
 * Structured JSON logger.
 *
 * Emits one JSON object per line to stdout/stderr with `timestamp` (ISO 8601),
 * `level` (string label), and `message` — the fields required by our
 * observability rules. Attach request-scoped context (`request_id`, `route`,
 * `user_id`, `duration_ms`) via {@link createRequestLogger}.
 *
 * No transports/worker threads are configured on purpose: plain JSON to stdout
 * lets the process supervisor (systemd, Docker) own collection, and avoids
 * worker-thread issues in the Next.js server runtime.
 *
 * NEVER log secrets, tokens, or PII (payment payloads, raw card/customer data).
 */
const options: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  messageKey: 'message',
  // ISO 8601 UTC timestamp under the `timestamp` key.
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    // Emit the level as a string label ("info") rather than a number.
    level: (label) => ({ level: label }),
  },
};

/** Build a logger instance. Accepts a custom destination for testing. */
export function buildLogger(destination?: DestinationStream): Logger {
  return destination ? pino(options, destination) : pino(options);
}

export const logger = buildLogger();

/** Request-scoped context attached to every line from the returned child. */
export interface RequestLogContext {
  request_id?: string;
  route?: string;
  user_id?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

/** Create a child logger that stamps every line with request-scoped context. */
export function createRequestLogger(context: RequestLogContext): Logger {
  return logger.child(context);
}
