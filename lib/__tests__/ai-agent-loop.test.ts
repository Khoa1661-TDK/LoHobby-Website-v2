import { describe, expect, it, vi } from 'vitest';
import { runAgentLoop, type LoopEvent } from '@/lib/ai/agent-loop';
import type { LlmConfig } from '@/lib/ai/provider';

/** Build a config whose client returns the given completions in order. */
function configReturning(responses: unknown[]): { cfg: LlmConfig; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn();
  for (const response of responses) create.mockResolvedValueOnce(response);
  const cfg = {
    client: { chat: { completions: { create } } },
    model: 'test-model',
    baseURL: 'http://127.0.0.1:8080/v1',
    tuning: { temperature: 0.2 },
    isLocal: true,
  } as unknown as LlmConfig;
  return { cfg, create };
}

function textReply(content: string): unknown {
  return { choices: [{ message: { content, tool_calls: [] } }] };
}

function toolReply(name: string, args: string, id = 'call_1'): unknown {
  return {
    choices: [
      { message: { content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: args } }] } },
    ],
  };
}

async function run(
  responses: unknown[],
  dispatch: (name: string, args: Record<string, unknown>) => Promise<{ content: string; emit?: unknown }>,
  maxTurns = 4,
): Promise<LoopEvent[]> {
  const events: LoopEvent[] = [];
  const { cfg } = configReturning(responses);
  await runAgentLoop({
    cfg,
    system: 'sys',
    userContent: 'hi',
    tools: [],
    dispatch,
    maxTurns,
    maxTokens: 512,
    send: (event) => events.push(event),
  });
  return events;
}

describe('runAgentLoop', () => {
  it('should emit a summary and stop when no tool is called', async () => {
    const events = await run([textReply('all done')], async () => ({ content: '' }));
    expect(events).toContainEqual({ type: 'summary', text: 'all done' });
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
  });

  it('should dispatch a tool call then continue to the next turn', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'result' });
    const events = await run([toolReply('find_orders', '{"limit":5}'), textReply('found them')], dispatch);
    expect(dispatch).toHaveBeenCalledWith('find_orders', { limit: 5 });
    expect(events).toContainEqual({ type: 'tool', name: 'find_orders' });
    expect(events).toContainEqual({ type: 'summary', text: 'found them' });
  });

  it('should forward an emit payload as a data event', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'staged', emit: { kind: 'orderAction' } });
    const events = await run([toolReply('propose_order_action', '{}'), textReply('ok')], dispatch);
    expect(events).toContainEqual({ type: 'data', payload: { kind: 'orderAction' } });
  });

  it('should report invalid tool arguments without aborting', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'never' });
    const events = await run([toolReply('find_orders', '{bad json'), textReply('recovered')], dispatch);
    expect(dispatch).toHaveBeenCalledWith('find_orders', {});
    expect(events).toContainEqual({ type: 'summary', text: 'recovered' });
  });

  it('should surface a dispatch rejection as an error event and keep going', async () => {
    const dispatch = vi.fn().mockRejectedValue(new Error('boom'));
    const events = await run([toolReply('find_orders', '{}'), textReply('after')], dispatch);
    expect(events.some((e) => e.type === 'error' && e.error.includes('boom'))).toBe(true);
    expect(events).toContainEqual({ type: 'summary', text: 'after' });
  });

  it('should stop at maxTurns', async () => {
    const dispatch = vi.fn().mockResolvedValue({ content: 'again' });
    const events = await run(
      [toolReply('t', '{}'), toolReply('t', '{}'), toolReply('t', '{}')],
      dispatch,
      2,
    );
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
  });

  it('should assemble a tool call streamed in fragments', async () => {
    const chunks = [
      { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'get_order' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"order' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'Code":42}' } }] } }] },
    ];
    const streamed = { [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } };
    const dispatch = vi.fn().mockResolvedValue({ content: 'ok' });
    await run([streamed, textReply('done')], dispatch);
    expect(dispatch).toHaveBeenCalledWith('get_order', { orderCode: 42 });
  });

  it('should stream content deltas as token events', async () => {
    const chunks = [
      { choices: [{ delta: { content: 'Hel' } }] },
      { choices: [{ delta: { content: 'lo' } }] },
    ];
    const streamed = { [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } };
    const events = await run([streamed], async () => ({ content: '' }));
    expect(events).toContainEqual({ type: 'token', text: 'Hel' });
    expect(events).toContainEqual({ type: 'summary', text: 'Hello' });
  });

  it('should ignore reasoning_content deltas', async () => {
    const chunks = [
      { choices: [{ delta: { reasoning_content: 'thinking hard' } }] },
      { choices: [{ delta: { content: 'answer' } }] },
    ];
    const streamed = { [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; } };
    const events = await run([streamed], async () => ({ content: '' }));
    expect(events).toContainEqual({ type: 'summary', text: 'answer' });
    expect(events.some((e) => e.type === 'token' && e.text.includes('thinking'))).toBe(false);
  });
});
