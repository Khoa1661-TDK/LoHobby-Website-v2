import { describe, expect, it } from 'vitest';
import { ASSISTANT_TOOLS, buildSystemPrompt } from '@/lib/page-builder/assistant/tools';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';

describe('assistant tools', () => {
  it('should define exactly the five layout-mutation tools', () => {
    expect(ASSISTANT_TOOLS.map((t) => t.name).sort()).toEqual(
      ['add_block', 'duplicate_block', 'move_block', 'remove_block', 'update_block'].sort(),
    );
  });

  it('should mark add_block and update_block as strict with object field args', () => {
    const add = ASSISTANT_TOOLS.find((t) => t.name === 'add_block')!;
    expect((add as { strict?: boolean }).strict).toBe(true);
    expect(add.input_schema.properties).toHaveProperty('blockType');
    expect(add.input_schema.properties).toHaveProperty('fields');
    const update = ASSISTANT_TOOLS.find((t) => t.name === 'update_block')!;
    expect((update as { strict?: boolean }).strict).toBe(true);
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
