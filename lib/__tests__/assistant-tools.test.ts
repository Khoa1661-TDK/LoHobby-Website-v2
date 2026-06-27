import { describe, expect, it } from 'vitest';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

describe('assistant tools', () => {
  it('should define exactly the five layout-mutation tools as OpenAI functions', () => {
    expect(ASSISTANT_TOOLS.every((t) => t.type === 'function')).toBe(true);
    expect(ASSISTANT_TOOLS.map((t) => t.function.name).sort()).toEqual(
      ['add_block', 'duplicate_block', 'move_block', 'remove_block', 'update_block'].sort(),
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
});
