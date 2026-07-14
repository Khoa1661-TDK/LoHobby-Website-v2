// lib/page-builder/assistant/tools.ts — OpenAI-compatible tool defs + block-contract prompt.
// The route talks to any OpenAI-compatible endpoint (Gemini, DeepSeek, OpenRouter),
// so tools use the OpenAI function-calling shape. Field/enum correctness is enforced
// server-side in validate.ts, so we deliberately do NOT use provider `strict` mode
// (Gemini's OpenAI-compat layer does not reliably support it).
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import type { BlockSchema } from '@/lib/page-builder/block-schemas';
import { THEMED_COLOR_BASES } from '@/lib/page-builder/themed-color';

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

// Real relationship targets, keyed by the collection slug a field relates to (e.g.
// `categories`). Injected into the contract so the model picks an existing numeric id
// instead of fabricating one — a fabricated id makes Payload 400 the whole page save.
export type RelationshipOptions = Record<string, Array<{ id: number | string; label: string }>>;

function describeFieldLine(f: BlockSchema['fields'][number], rels: RelationshipOptions): string {
  const req = f.required ? ' [required]' : '';
  if (f.type === 'relationship') {
    const target = f.relationTo ?? 'a collection';
    const choices = (f.relationTo && rels[f.relationTo]) || [];
    if (choices.length > 0) {
      const list = choices.map((o) => `${o.id}=${o.label}`).join(', ');
      const many = f.hasMany ? ' (array of numeric ids)' : '';
      return `    - ${f.name}: numeric id of a ${target}${many} — valid ids: ${list}${req}`;
    }
    return `    - ${f.name}: numeric id of an existing ${target} (omit if unknown — never invent one)${req}`;
  }
  const opts = f.options ? ` (one of: ${f.options.map((o) => o.value).join(', ')})` : '';
  if (f.type === 'richText') {
    return `    - ${f.name}: richText — provide a Markdown string (paragraphs, # headings, **bold**, *italic*, [text](url), - lists)${req}`;
  }
  let range = '';
  if (f.type === 'number' && (typeof f.min === 'number' || typeof f.max === 'number')) {
    if (typeof f.min === 'number' && typeof f.max === 'number') range = ` (${f.min}–${f.max})`;
    else if (typeof f.min === 'number') range = ` (min ${f.min})`;
    else range = ` (max ${f.max})`;
  }
  return `    - ${f.name}: ${f.type}${opts}${range}${req}`;
}

function describeBlock(schema: BlockSchema, rels: RelationshipOptions): string {
  const fields = schema.fields.map((f) => describeFieldLine(f, rels)).join('\n');
  return `  ${schema.slug} — ${schema.label}\n${fields}`;
}

/** The light/dark slot pairs the model must set together, derived from THEMED_COLOR_BASES
 *  so the prompt tracks the schema instead of hardcoding field names. */
function themedColorPairs(): string {
  return Array.from(THEMED_COLOR_BASES)
    .map((base) => `${base} (light) + ${base}Dark (dark)`)
    .join(', ');
}

export function buildSystemPrompt(
  schemas: BlockSchema[],
  relationshipOptions: RelationshipOptions = {},
): string {
  const contract = schemas.map((s) => describeBlock(s, relationshipOptions)).join('\n');
  return [
    'You are a page-building assistant for an e-commerce storefront CMS.',
    'You construct and edit a page by calling the provided tools to mutate a block layout.',
    'You can ONLY use the block types and fields listed in the contract below — never invent a blockType or field name.',
    'Relationship fields must be set to a real numeric id from the contract. Never invent an id; if no suitable id exists, omit the field and leave the block unbound.',
    'Indices refer to the current layout the user message provides. After each tool call the layout changes, so reason about positions in order.',
    'Prefer sensible defaults and concise, on-brand copy. When the user asks to "build a page", add a coherent sequence of blocks (e.g. a hero, then feature/product sections, then an FAQ or newsletter).',
    '',
    'DUAL-LOCALE EDITING:',
    'The page exists in two locales, vi and en. Block STRUCTURE, ORDER, and TYPES are shared across both locales — add_block, move_block, remove_block, and duplicate_block always affect both at once. Only COPY (text) is per-locale.',
    'When you add a block, write the active-locale copy in `fields` and the other locale\'s translation in `fieldsOther`. If you omit `fieldsOther`, both locales get the same copy.',
    'Use update_block with `locale` to edit one locale\'s copy; use `locale: "both"` for shared/config fields (colors, enums, relationships).',
    'The layout snapshot truncates long strings to 80 chars. Before copying or faithfully translating a block between locales, call read_block to get its full field values.',
    '',
    'THEMED COLORS (light + dark):',
    `Some color fields come in light/dark pairs: ${themedColorPairs()}. The base field is the LIGHT-mode value and the "Dark" field is the DARK-mode value.`,
    'Whenever you set a background color, set BOTH slots. If you only know one color (e.g. from an image), set the light slot to it and derive a readable dark-mode variant for the "Dark" slot (dark surfaces with light text).',
    '',
    'If the user attaches an image, treat it as a design reference:',
    '- Map each visible section of the screenshot to the closest block in the contract; preserve top-to-bottom order and do not skip a section that has a plausible block match.',
    '- Transcribe visible copy VERBATIM for the locale it appears to be in, and write a faithful translation for the other locale (via fields + fieldsOther).',
    '- Extract the dominant background and accent colors; set the light color slot from the image and derive a readable dark-mode variant for the paired "Dark" slot.',
    '',
    'When finished, end your turn with a one-sentence summary of what you changed.',
    '',
    'BLOCK CONTRACT (available blocks and their fields):',
    contract,
  ].join('\n');
}
