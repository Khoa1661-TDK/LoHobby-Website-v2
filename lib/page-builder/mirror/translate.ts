// lib/page-builder/mirror/translate.ts — best-effort batched translation of UI copy via
// OpenRouter (OpenAI-compatible). Never throws: on any failure returns the source map
// unchanged so the caller can mirror structure with untranslated text and log a warning.
import OpenAI from 'openai';
import type { TextEntry } from './translatable';

const LANG_NAME: Record<string, string> = { vi: 'Vietnamese', en: 'English' };
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export type TranslateClient = {
  chat: {
    completions: {
      create: (params: unknown) => Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
};

export function createTranslateClient(): TranslateClient | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' }) as unknown as TranslateClient;
}

function extractJson(content: string): Record<string, string> | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1));
    if (parsed && typeof parsed === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function translateTextMap(
  entries: TextEntry[],
  sourceLocale: string,
  targetLocale: string,
  client: TranslateClient | null,
): Promise<Record<string, string>> {
  const source: Record<string, string> = {};
  for (const e of entries) source[e.path] = e.value;
  if (Object.keys(source).length === 0 || !client) return source; // nothing to do / no key

  const srcName = LANG_NAME[sourceLocale] ?? sourceLocale;
  const tgtName = LANG_NAME[targetLocale] ?? targetLocale;
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const system =
    `You translate user-interface copy from ${srcName} to ${tgtName}. ` +
    `Return ONLY a JSON object with the exact same keys and the translated string values. ` +
    `Preserve brand names, URLs, and placeholders. Do not add commentary.`;

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(source) },
      ],
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) return source;
    const translated = extractJson(content);
    if (!translated) return source;
    const result: Record<string, string> = {};
    for (const [path, value] of Object.entries(source)) {
      result[path] = translated[path] ?? value;
    }
    return result;
  } catch (err) {
    console.warn('[mirror] translation failed, copying source text:', err);
    return source;
  }
}