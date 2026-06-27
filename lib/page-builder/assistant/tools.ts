// lib/page-builder/assistant/tools.ts — OpenAI-compatible tool defs + block-contract prompt.
// The route talks to any OpenAI-compatible endpoint (Gemini, DeepSeek, OpenRouter),
// so tools use the OpenAI function-calling shape. Field/enum correctness is enforced
// server-side in validate.ts, so we deliberately do NOT use provider `strict` mode
// (Gemini's OpenAI-compat layer does not reliably support it).
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';

export const ASSISTANT_TOOLS: ChatCompletionFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_block',
      description:
        'Insert a new block into the page layout at the given index. Use a blockType that exists in the block contract and only fields that block defines.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockType: { type: 'string', description: 'Slug of an existing block, e.g. "hero".' },
          index: { type: 'integer', description: 'Position to insert at; 0 is the top.' },
          fields: {
            type: 'object',
            description: 'Field values for this block. Keys must be fields the block defines.',
          },
        },
        required: ['blockType', 'index', 'fields'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_block',
      description: 'Update one or more field values on the block at the given index.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block to update.' },
          fields: { type: 'object', description: 'Field values to set on the block.' },
        },
        required: ['index', 'fields'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_block',
      description: 'Move the block at index `from` to position `to`.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          from: { type: 'integer' },
          to: { type: 'integer' },
        },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_block',
      description: 'Delete the block at the given index.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { index: { type: 'integer' } },
        required: ['index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'duplicate_block',
      description: 'Duplicate the block at the given index, inserting the copy right after it.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { index: { type: 'integer' } },
        required: ['index'],
      },
    },
  },
];

function describeBlock(schema: BlockSchema): string {
  const fields = schema.fields
    .map((f) => {
      const opts = f.options ? ` (one of: ${f.options.map((o) => o.value).join(', ')})` : '';
      const req = f.required ? ' [required]' : '';
      return `    - ${f.name}: ${f.type}${opts}${req}`;
    })
    .join('\n');
  return `  ${schema.slug} — ${schema.label}\n${fields}`;
}

export function buildSystemPrompt(schemas: BlockSchema[]): string {
  const contract = schemas.map(describeBlock).join('\n');
  return [
    'You are a page-building assistant for an e-commerce storefront CMS.',
    'You construct and edit a page by calling the provided tools to mutate a block layout.',
    'You can ONLY use the block types and fields listed in the contract below — never invent a blockType or field name.',
    'Indices refer to the current layout the user message provides. After each tool call the layout changes, so reason about positions in order.',
    'Prefer sensible defaults and concise, on-brand copy. When the user asks to "build a page", add a coherent sequence of blocks (e.g. a hero, then feature/product sections, then an FAQ or newsletter).',
    'When finished, end your turn with a one-sentence summary of what you changed.',
    '',
    'BLOCK CONTRACT (available blocks and their fields):',
    contract,
  ].join('\n');
}
