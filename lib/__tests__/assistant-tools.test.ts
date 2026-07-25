import { describe, expect, it } from 'vitest';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

describe('assistant tools', () => {
  it('should define the layout-mutation tools plus the read-only tools as OpenAI functions', () => {
    expect(ASSISTANT_TOOLS.every((t) => t.type === 'function')).toBe(true);
    expect(ASSISTANT_TOOLS.map((t) => t.function.name).sort()).toEqual(
      [
        'add_block', 'add_row', 'describe_block', 'duplicate_block', 'move_block',
        'read_block', 'remove_block', 'remove_row', 'search_catalog', 'search_media',
        'update_block', 'update_row',
      ].sort(),
    );
  });

  it('should expose object field args for add_block and update_block', () => {
    const add = ASSISTANT_TOOLS.find((t) => t.function.name === 'add_block')!;
    const addProps = (add.function.parameters?.properties ?? {}) as Record<string, unknown>;
    expect(addProps).toHaveProperty('blockType');
    expect(addProps).toHaveProperty('fields');
    const update = ASSISTANT_TOOLS.find((t) => t.function.name === 'update_block')!;
    const updateProps = (update.function.parameters?.properties ?? {}) as Record<string, unknown>;
    expect(updateProps).toHaveProperty('fields');
  });
});

describe('buildSystemPrompt', () => {
  it('should list every available block slug in the contract', () => {
    const schemas = getBlockSchemas();
    const prompt = buildSystemPrompt(schemas);
    for (const s of schemas) {
      expect(prompt).toContain(s.slug);
    }
  });

  it('should stay under the 20000-char prompt budget', () => {
    const prompt = buildSystemPrompt(getBlockSchemas());
    expect(prompt.length).toBeLessThan(20000);
  });

  it('should instruct the model to call describe_block before using a block', () => {
    const prompt = buildSystemPrompt(getBlockSchemas());
    expect(prompt).toContain('describe_block');
  });
});
