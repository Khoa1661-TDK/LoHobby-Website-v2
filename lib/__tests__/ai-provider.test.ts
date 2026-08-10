import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LlmNotConfiguredError,
  buildTuning,
  getLlmConfig,
  getMaxTurns,
  isLocalBaseUrl,
  probeLlm,
} from '@/lib/ai/provider';

const ENV_KEYS = [
  'ASSISTANT_LLM_API_KEY',
  'ASSISTANT_LLM_BASE_URL',
  'ASSISTANT_LLM_MODEL',
  'ASSISTANT_LLM_MAX_TURNS',
  'ASSISTANT_LLM_THINKING',
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

describe('isLocalBaseUrl', () => {
  it('should treat loopback as local', () => {
    expect(isLocalBaseUrl('http://127.0.0.1:8080/v1')).toBe(true);
    expect(isLocalBaseUrl('http://localhost:8080/v1')).toBe(true);
  });

  it('should treat private ranges as local', () => {
    expect(isLocalBaseUrl('http://192.168.1.50:8080/v1')).toBe(true);
    expect(isLocalBaseUrl('http://10.10.10.41:8080/v1')).toBe(true);
    expect(isLocalBaseUrl('http://172.17.0.1:8080/v1')).toBe(true);
  });

  it('should treat public hosts as remote', () => {
    expect(isLocalBaseUrl('https://openrouter.ai/api/v1')).toBe(false);
    expect(isLocalBaseUrl('http://172.1.0.1:8080/v1')).toBe(false);
  });

  it('should treat an unparseable url as remote', () => {
    expect(isLocalBaseUrl('not a url')).toBe(false);
  });
});

describe('buildTuning', () => {
  it('should disable thinking when thinking is off', () => {
    const tuning = buildTuning(false);
    expect(tuning.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it('should omit chat_template_kwargs when thinking is on', () => {
    const tuning = buildTuning(true);
    expect(tuning.chat_template_kwargs).toBeUndefined();
  });

  it('should pin sampling params for reliable tool calls', () => {
    const tuning = buildTuning(false);
    expect(tuning.temperature).toBe(0.2);
    expect(tuning.top_p).toBe(0.8);
    expect(tuning.top_k).toBe(20);
    expect(tuning.parallel_tool_calls).toBe(false);
  });
});

describe('getLlmConfig', () => {
  it('should throw LlmNotConfiguredError when the api key is missing', () => {
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    expect(() => getLlmConfig()).toThrow(LlmNotConfiguredError);
  });

  it('should read base url and model from the environment', () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    process.env.ASSISTANT_LLM_MODEL = 'qwen3.6-35b-a3b';
    const cfg = getLlmConfig();
    expect(cfg.model).toBe('qwen3.6-35b-a3b');
    expect(cfg.baseURL).toBe('http://127.0.0.1:8080/v1');
    expect(cfg.isLocal).toBe(true);
  });

  it('should default to thinking off', () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    const cfg = getLlmConfig();
    expect(cfg.tuning.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it('should keep thinking on when explicitly enabled', () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_THINKING = 'on';
    const cfg = getLlmConfig();
    expect(cfg.tuning.chat_template_kwargs).toBeUndefined();
  });
});

describe('getMaxTurns', () => {
  it('should return the fallback when unset', () => {
    expect(getMaxTurns(28)).toBe(28);
  });

  it('should read a valid override', () => {
    process.env.ASSISTANT_LLM_MAX_TURNS = '8';
    expect(getMaxTurns(28)).toBe(8);
  });

  it('should ignore a non-numeric or non-positive override', () => {
    process.env.ASSISTANT_LLM_MAX_TURNS = 'lots';
    expect(getMaxTurns(28)).toBe(28);
    process.env.ASSISTANT_LLM_MAX_TURNS = '0';
    expect(getMaxTurns(28)).toBe(28);
  });
});

describe('probeLlm', () => {
  it('should return null for a remote provider without any fetch', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'k';
    process.env.ASSISTANT_LLM_BASE_URL = 'https://openrouter.ai/api/v1';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await probeLlm(getLlmConfig())).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should return null when the local server answers', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    expect(await probeLlm(getLlmConfig())).toBeNull();
  });

  it('should return a named error when the local server refuses', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const reason = await probeLlm(getLlmConfig());
    expect(reason).toContain('run-qwen.sh');
    expect(reason).toContain('http://127.0.0.1:8080/v1');
  });

  it('should return a named error on a non-ok response', async () => {
    process.env.ASSISTANT_LLM_API_KEY = 'local';
    process.env.ASSISTANT_LLM_BASE_URL = 'http://127.0.0.1:8080/v1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await probeLlm(getLlmConfig())).toContain('503');
  });
});
