// lib/ai/agent-loop.ts — provider-agnostic streaming tool-use loop.
// Modelled on the page-builder assistant route, generalised over the tool set so any
// surface can drive it by supplying a dispatch function.
import type {
  ChatCompletionContentPart,
  ChatCompletionFunctionTool,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';
import type { LlmConfig } from '@/lib/ai/provider';

export type LoopEvent =
  | { type: 'token'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'tool'; name: string }
  | { type: 'data'; payload: unknown }
  | { type: 'done' };

export type LoopToolOutcome = { content: string; emit?: unknown };

export type AgentLoopArgs = {
  cfg: LlmConfig;
  system: string;
  userContent: string | ChatCompletionContentPart[];
  tools: ChatCompletionFunctionTool[];
  /** Executes one tool. Should not throw; a rejection is reported and the loop continues. */
  dispatch: (name: string, args: Record<string, unknown>) => Promise<LoopToolOutcome>;
  maxTurns: number;
  maxTokens: number;
  send: (event: LoopEvent) => void;
  signal?: AbortSignal;
};

/** A tool call being assembled across streamed chunks. The upstream sends id/name once
 *  and the JSON arguments in fragments, keyed by `index`. */
type ToolCallAcc = { index: number; id: string; name: string; args: string };

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
};

/** Consume either a streamed completion or a plain completion object. Non-streaming is
 *  what unit tests and non-SSE providers return. */
async function collectResponse(
  result: unknown,
  onToken: (text: string) => void,
): Promise<{ content: string; toolCalls: ChatCompletionMessageToolCall[] }> {
  const iterable = result as { [Symbol.asyncIterator]?: unknown } | null;
  if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
    let content = '';
    const accs = new Map<number, ToolCallAcc>();
    for await (const chunk of result as AsyncIterable<StreamChunk>) {
      const delta = chunk?.choices?.[0]?.delta;
      if (!delta) continue;
      // `reasoning_content` is deliberately not read: Qwen emits its chain of thought
      // there, and concatenating it would put reasoning in the user-visible reply.
      if (typeof delta.content === 'string' && delta.content.length > 0) {
        content += delta.content;
        onToken(delta.content);
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = typeof tc.index === 'number' ? tc.index : 0;
          let acc = accs.get(idx);
          if (!acc) {
            acc = { index: idx, id: '', name: '', args: '' };
            accs.set(idx, acc);
          }
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) acc.args += tc.function.arguments;
        }
      }
    }
    const toolCalls: ChatCompletionMessageToolCall[] = [...accs.values()]
      .sort((a, b) => a.index - b.index)
      .map((a) => ({ id: a.id, type: 'function', function: { name: a.name, arguments: a.args } }));
    return { content, toolCalls };
  }
  const msg = (result as { choices?: Array<{ message?: ChatCompletionMessage }> })?.choices?.[0]
    ?.message;
  const content = typeof msg?.content === 'string' ? msg.content : '';
  const toolCalls = (msg?.tool_calls ?? []) as ChatCompletionMessageToolCall[];
  return { content, toolCalls };
}

export async function runAgentLoop(args: AgentLoopArgs): Promise<void> {
  const { cfg, system, userContent, tools, dispatch, maxTurns, maxTokens, send, signal } = args;
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];

  try {
    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break;

      const result = await cfg.client.chat.completions.create({
        model: cfg.model,
        max_tokens: maxTokens,
        tools,
        tool_choice: 'auto',
        messages,
        stream: true,
        ...cfg.tuning,
      });

      const { content, toolCalls } = await collectResponse(result, (text) =>
        send({ type: 'token', text }),
      );

      messages.push({
        role: 'assistant',
        content: content || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      if (toolCalls.length === 0) {
        const text = content.trim();
        if (text) send({ type: 'summary', text });
        return;
      }

      for (const call of toolCalls) {
        if (call.type !== 'function') {
          messages.push({ role: 'tool', tool_call_id: call.id, content: 'Unsupported tool call.' });
          continue;
        }

        // Malformed JSON is reported to the model rather than aborting the run: it
        // usually retries correctly on the next turn.
        let parsed: Record<string, unknown> = {};
        try {
          const raw = JSON.parse(call.function.arguments || '{}') as unknown;
          if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            parsed = raw as Record<string, unknown>;
          }
        } catch {
          parsed = {};
        }

        send({ type: 'tool', name: call.function.name });

        let outcome: LoopToolOutcome;
        try {
          outcome = await dispatch(call.function.name, parsed);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Tool failed.';
          send({ type: 'error', error: message });
          outcome = { content: `ERROR: ${message}` };
        }

        if (outcome.emit !== undefined) send({ type: 'data', payload: outcome.emit });
        messages.push({ role: 'tool', tool_call_id: call.id, content: outcome.content });
      }
    }
  } catch (err) {
    send({ type: 'error', error: err instanceof Error ? err.message : 'Assistant failed.' });
  } finally {
    send({ type: 'done' });
  }
}
