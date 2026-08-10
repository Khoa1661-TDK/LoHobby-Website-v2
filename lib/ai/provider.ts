// lib/ai/provider.ts — the one place that knows anything model-specific.
// Both AI surfaces build their OpenAI client here so a model swap is an .env edit.
import OpenAI from 'openai';

export type LlmConfig = {
  client: OpenAI;
  model: string;
  baseURL: string;
  /** Extra params spread into every chat.completions.create call. */
  tuning: Record<string, unknown>;
  isLocal: boolean;
};

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('Assistant is not configured.');
    this.name = 'LlmNotConfiguredError';
  }
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEFAULT_MODEL = 'gemini-2.5-flash';

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0', '::1'];

/** True for loopback and RFC1918 private ranges. Deliberately string-based:
 *  a character-class regex in lib/ breaks the Tailwind build. */
export function isLocalBaseUrl(baseURL: string): boolean {
  let host: string;
  try {
    host = new URL(baseURL).hostname;
  } catch {
    return false;
  }
  if (LOOPBACK_HOSTS.includes(host)) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('172.')) {
    const second = Number.parseInt(host.split('.')[1] ?? '', 10);
    return Number.isInteger(second) && second >= 16 && second <= 31;
  }
  return false;
}

/** Qwen3.6 corrections, safe for cloud models too.
 *  - enable_thinking:false — Qwen reasons by default and bills it to max_tokens, so
 *    `content` comes back empty with finish_reason "length". A top-level `reasoning`
 *    field is silently ignored; only chat_template_kwargs works.
 *  - sampling — llama.cpp's server default is temp 1.0 / top_p 0.95, too loose for
 *    tool-call JSON.
 *  - parallel_tool_calls:false — the loop echoes state back between calls, so parallel
 *    calls would reason against stale state. Ignored harmlessly where unsupported. */
export function buildTuning(thinkingEnabled: boolean): Record<string, unknown> {
  const tuning: Record<string, unknown> = {
    temperature: 0.2,
    top_p: 0.8,
    top_k: 20,
    parallel_tool_calls: false,
  };
  if (!thinkingEnabled) {
    tuning.chat_template_kwargs = { enable_thinking: false };
  }
  return tuning;
}

/** Build the client from env. Env is read per call so tests can vary it. */
export function getLlmConfig(): LlmConfig {
  const apiKey = process.env.ASSISTANT_LLM_API_KEY?.trim();
  if (!apiKey) throw new LlmNotConfiguredError();
  const baseURL = process.env.ASSISTANT_LLM_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.ASSISTANT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const thinkingEnabled = process.env.ASSISTANT_LLM_THINKING?.trim() === 'on';
  return {
    client: new OpenAI({ apiKey, baseURL }),
    model,
    baseURL,
    tuning: buildTuning(thinkingEnabled),
    isLocal: isLocalBaseUrl(baseURL),
  };
}

/** Turn cap, overridable per deployment without touching code. */
export function getMaxTurns(fallback: number): number {
  const raw = process.env.ASSISTANT_LLM_MAX_TURNS?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reachability check for the local server only. Returns null when reachable,
 *  otherwise a message fit to show the user instead of a raw ECONNREFUSED. */
export async function probeLlm(cfg: LlmConfig): Promise<string | null> {
  if (!cfg.isLocal) return null;
  const url = `${cfg.baseURL.replace(/\/+$/, '')}/models`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return null;
    return `Local model server answered ${res.status} at ${cfg.baseURL}. Restart it with ~/llama.cpp/run-qwen.sh`;
  } catch {
    return `Local model is not running at ${cfg.baseURL}. Start it with ~/llama.cpp/run-qwen.sh`;
  }
}
