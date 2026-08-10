// lib/admin-assistant/tool-kit.ts — outcome builders and argument coercion.
// Every tool uses these so error text and argument handling stay uniform.
import type { ToolOutcome } from '@/lib/admin-assistant/types';

/** Success. A non-string body is JSON-encoded for the model. */
export function ok(body: unknown, emit?: unknown): ToolOutcome {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  return emit === undefined ? { content } : { content, emit };
}

/** Failure. The ERROR: prefix is the signal the loop's model uses to self-correct. */
export function fail(message: string): ToolOutcome {
  return { content: `ERROR: ${message}` };
}

export function asStr(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function asBool(args: Record<string, unknown>, key: string): boolean | null {
  const value = args[key];
  return typeof value === 'boolean' ? value : null;
}

/** Strict integer read. Accepts a numeric string because models often quote ids. */
export function asInt(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

/** Optional bounded integer, e.g. a result limit. */
export function optInt(
  args: Record<string, unknown>,
  key: string,
  fallback: number,
  max: number,
): number {
  const parsed = asInt(args, key);
  if (parsed === null || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}
