// lib/page-builder/assistant/tools.ts — OpenAI-compatible tool defs + block-contract prompt.
// The route talks to any OpenAI-compatible endpoint (Gemini, DeepSeek, OpenRouter),
// so tools use the OpenAI function-calling shape. Field/enum correctness is enforced
// server-side in validate.ts, so we deliberately do NOT use provider `strict` mode
// (Gemini's OpenAI-compat layer does not reliably support it).
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import { buildBlockIndex, buildAppearanceDoc } from '@/lib/page-builder/assistant/contract';

export const ASSISTANT_TOOLS: ChatCompletionFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_block',
      description:
        'Insert a new block into the page layout at the given index. The block is added to BOTH locales at once (structure is shared). Use a blockType that exists in the block contract and only fields that block defines.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockType: { type: 'string', description: 'Slug of an existing block, e.g. "hero".' },
          index: { type: 'integer', description: 'Position to insert at; 0 is the top.' },
          fields: {
            type: 'object',
            description:
              'Field values for the block, written in the ACTIVE locale. Keys must be fields the block defines.',
          },
          fieldsOther: {
            type: 'object',
            description:
              'Optional: copy for the OTHER locale (same field keys, translated text). Omit to reuse the active-locale copy verbatim. Shared/config fields default to the active values.',
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
      description:
        'Update one or more field values on the block at the given index. Targets the active locale by default; pass locale to edit a specific locale or "both".',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block to update.' },
          fields: { type: 'object', description: 'Field values to set on the block.' },
          locale: {
            type: 'string',
            enum: ['vi', 'en', 'both'],
            description:
              'Which locale copy to update. Defaults to the active locale. Use "both" for shared/config fields (colors, enums, relationships).',
          },
        },
        required: ['index', 'fields'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_block',
      description:
        'Read the full, untruncated field values of the block at the given index in a locale. The layout snapshot truncates long strings — use this before copying or translating a block between locales. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block to read.' },
          locale: {
            type: 'string',
            enum: ['vi', 'en'],
            description: 'Which locale copy to read. Defaults to the active locale.',
          },
        },
        required: ['index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describe_block',
      description:
        'Get the full field spec for one block type: every field with its type, allowed enum values, default, whether a condition gates it, and the row shape of any array field. Call this before using a block type for the first time. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          blockType: { type: 'string', description: 'Slug of a block from the index, e.g. "faq".' },
        },
        required: ['blockType'],
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
  {
    type: 'function',
    function: {
      name: 'add_row',
      description:
        'Add one row to an array field on a block (FAQ items, stats, cards, gallery images). Affects BOTH locales so row counts stay aligned. Use this to fill a block rather than rewriting the whole array with update_block.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block that owns the array.' },
          field: { type: 'string', description: 'Name of the array field, e.g. "items".' },
          values: { type: 'object', description: 'Row values in the ACTIVE locale.' },
          valuesOther: { type: 'object', description: 'Optional translated row values for the OTHER locale.' },
          at: { type: 'integer', description: 'Optional position; appends when omitted.' },
        },
        required: ['index', 'field', 'values'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_row',
      description:
        'Patch the named fields of one row in an array field, leaving the other rows and the row\'s other fields untouched.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer', description: 'Index of the block that owns the array.' },
          field: { type: 'string', description: 'Name of the array field.' },
          rowIndex: { type: 'integer', description: 'Zero-based index of the row to patch.' },
          values: { type: 'object', description: 'Row field values to set.' },
          locale: {
            type: 'string',
            enum: ['vi', 'en', 'both'],
            description: 'Which locale copy to update. Defaults to the active locale.',
          },
        },
        required: ['index', 'field', 'rowIndex', 'values'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_row',
      description: 'Delete one row from an array field. Affects BOTH locales so row counts stay aligned.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: { type: 'integer' },
          field: { type: 'string' },
          rowIndex: { type: 'integer' },
        },
        required: ['index', 'field', 'rowIndex'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_media',
      description:
        'Find images in the media library by filename or alt text, returning their numeric ids. Call this to fill any upload field (hero image, gallery rows, card images). An empty query returns the most recent uploads. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', description: 'Text to match against filename and alt text. Empty for recent uploads.' },
          limit: { type: 'integer', description: 'Maximum results (default 10, max 50).' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_catalog',
      description:
        'Find products or categories by title, returning their numeric ids for relationship fields. Never invent an id — always look it up here. Returns data only; it changes nothing.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          collection: { type: 'string', enum: ['products', 'categories'] },
          query: { type: 'string', description: 'Text to match against the title. Empty to list some.' },
          limit: { type: 'integer', description: 'Maximum results (default 10, max 50).' },
        },
        required: ['collection', 'query'],
      },
    },
  },
];

export function buildSystemPrompt(schemas: BlockSchema[]): string {
  return [
    'You are a page-building assistant for an e-commerce storefront CMS.',
    'You construct and edit a page by calling the provided tools to mutate a block layout.',
    'You can ONLY use the block types and fields listed in the index below — never invent a blockType or field name.',
    '',
    'HOW TO USE A BLOCK:',
    'The index below lists every block and its field NAMES only. Before the first add_block or update_block against a block type, call describe_block(slug) to get that block\'s full field spec — types, allowed enum values, defaults, which fields are gated by a condition, and the row shape of any array field. Guessing a field shape wastes a turn on a validation error.',
    'To find an image for an upload field call search_media; to find a product or category id for a relationship field call search_catalog. Never invent an id.',
    '',
    'EDITING RULES:',
    'Indices refer to the CURRENT layout. After every tool call you receive the updated layout back — always re-read those indices before your next edit; never reuse an index from an earlier snapshot.',
    'Because add/remove/move shift the indices of every block after them, make structural edits ONE AT A TIME: issue a single add/remove/move/duplicate, wait for the echoed layout, then decide the next index from it. Do not batch several structural calls guessing at future positions.',
    'To fill or edit the rows of an array field (FAQ items, stats, cards, gallery images), use add_row / update_row / remove_row rather than rewriting the whole array through update_block.',
    'Prefer sensible defaults and concise, on-brand copy. When the user asks to "build a page", add a coherent sequence of blocks (e.g. a hero, then feature/product sections, then an FAQ or newsletter) AND fill their array rows — a block with zero rows renders as an empty section.',
    '',
    'DUAL-LOCALE EDITING:',
    'The page exists in two locales, vi and en. Block STRUCTURE, ORDER, and TYPES are shared across both locales — add_block, move_block, remove_block, and duplicate_block always affect both at once. Only COPY (text) is per-locale.',
    'Array ROW COUNT is also shared: add_row and remove_row affect both locales, taking `values` for the active locale and optional `valuesOther` for the translation. update_row edits one locale\'s copy and takes a `locale` tag.',
    'When you add a block, write the active-locale copy in `fields` and the other locale\'s translation in `fieldsOther`. If you omit `fieldsOther`, both locales get the same copy.',
    'Use update_block with `locale` to edit one locale\'s copy; use `locale: "both"` for shared/config fields (colors, enums, relationships).',
    'The layout snapshot truncates long strings to 80 chars. Before copying or faithfully translating a block between locales, call read_block to get its full field values.',
    '',
    buildAppearanceDoc(schemas),
    '',
    'If the user attaches an image, treat it as a design reference:',
    '- Map each visible section of the screenshot to the closest block in the index; preserve top-to-bottom order and do not skip a section that has a plausible block match.',
    '- Transcribe visible copy VERBATIM for the locale it appears to be in, and write a faithful translation for the other locale (via fields + fieldsOther).',
    '- Extract the dominant background and accent colors; set the light color slot from the image and derive a readable dark-mode variant for the paired "Dark" slot.',
    '',
    'When finished, end your turn with a one-sentence summary of what you changed.',
    '',
    'BLOCK INDEX (field names only — call describe_block for the full spec):',
    buildBlockIndex(schemas),
  ].join('\n');
}
