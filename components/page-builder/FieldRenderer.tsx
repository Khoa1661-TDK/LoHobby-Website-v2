// components/page-builder/FieldRenderer.tsx — schema-driven field panel.
'use client';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import { isFieldVisible } from '@/lib/page-builder/conditions';
import { defaultRowFor } from '@/lib/page-builder/default-block';
import { addRow, removeRow, moveRow, updateRowField } from '@/lib/page-builder/array-reducer';
import MediaPicker from './MediaPicker';
import RelationshipPicker, { type RelationItem } from './RelationshipPicker';
import RichTextField from './RichTextField';
import { activeColorSlot, THEMED_COLOR_BASES, THEMED_DARK_SLOTS, type ThemeMode } from '@/lib/page-builder/themed-color';

type Props = {
  schema: BlockSchema;
  values: Record<string, unknown>;
  /** Phase 1: omit to render read-only. Phase 2 wires this. */
  onChange?: (name: string, value: unknown) => void;
  /** Which theme slot themed color fields edit. Defaults to light. */
  themeMode?: ThemeMode;
};

// Mirrors the shared appearanceFields in src/payload/blocks/_appearance.ts so every
// appearance knob lands in the collapsible Appearance section rather than the main
// field list. Keep in sync when appearance fields are added/removed.
const APPEARANCE_FIELDS = new Set([
  'background',
  'backgroundCustom',
  'backgroundCustomDark',
  'containerWidth',
  'maxWidthCustom',
  'paddingY',
  'contentAlign',
  'rounded',
  'border',
  'scrollAnimation',
]);

// Fields that exist for internal bookkeeping (cross-locale mirroring) and must never be
// shown or edited in the panel.
const HIDDEN_FIELDS = new Set(['blockKey']);

export default function FieldRenderer({ schema, values, onChange, themeMode = 'light' }: Props): ReactElement {
  const visible = (f: FieldDescriptor) => isFieldVisible(f, values);
  const sectionFields = schema.fields.filter(
    (f) => !APPEARANCE_FIELDS.has(f.name) && !HIDDEN_FIELDS.has(f.name) && visible(f),
  );
  const appearanceFields = schema.fields.filter(
    (f) => APPEARANCE_FIELDS.has(f.name) && !THEMED_DARK_SLOTS.has(f.name) && visible(f),
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-500">
        {schema.label}
      </h2>
      {sectionFields.map((field) => (
        <Field key={field.name} field={field} value={values[field.name]} onChange={onChange} themeMode={themeMode} values={values} />
      ))}
      {appearanceFields.length > 0 && (
        <details className="rounded border border-warm-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Appearance</summary>
          <div className="flex flex-col gap-4 p-3">
            {appearanceFields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={values[field.name]}
                onChange={onChange}
                themeMode={themeMode}
                values={values}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ArrayField({
  field,
  rows,
  onChange,
}: {
  field: FieldDescriptor;
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}): ReactElement {
  const subFields = field.fields ?? [];
  return (
    <div className="flex flex-col gap-2 rounded border border-warm-200 p-2">
      <span className="text-xs font-medium text-warm-600">{field.label ?? field.name}</span>
      {rows.map((row, index) => (
        <div key={index} className="flex flex-col gap-2 rounded border border-warm-100 p-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-warm-400">Row {index + 1}</span>
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onChange(moveRow(rows, index, index - 1))}
                className="text-xs"
                aria-label="Move row up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === rows.length - 1}
                onClick={() => onChange(moveRow(rows, index, index + 1))}
                className="text-xs"
                aria-label="Move row down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(removeRow(rows, index))}
                className="text-xs text-red-500"
                aria-label="Remove row"
              >
                ✕
              </button>
            </div>
          </div>
          {subFields.map((subField) => (
            <Field
              key={subField.name}
              field={subField}
              value={row[subField.name]}
              onChange={(name, value) =>
                onChange(updateRowField(rows, index, name, value))
              }
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(addRow(rows, defaultRowFor(subFields)))}
        className="rounded border border-dashed border-warm-300 px-2 py-1 text-xs text-warm-500 hover:border-blue-400"
      >
        + Add {field.label ?? 'item'}
      </button>
    </div>
  );
}

function GroupField({
  field,
  value,
  onChange,
}: {
  field: FieldDescriptor;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}): ReactElement {
  const subFields = field.fields ?? [];
  return (
    <div className="flex flex-col gap-3 rounded border border-warm-200 p-2">
      {subFields.map((subField) => (
        <Field
          key={subField.name}
          field={subField}
          value={value[subField.name]}
          onChange={(name, v) => onChange({ ...value, [name]: v })}
        />
      ))}
    </div>
  );
}

// Coerce a stored value (ISO string or epoch ms) into the `YYYY-MM-DDTHH:mm`
// shape the native datetime-local input expects, in local time. Returns '' when
// the value is missing or unparseable so the input stays empty rather than NaN.
function toDateInputValue(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RelationshipField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}): ReactElement {
  const relationTo: 'products' | 'categories' =
    field.relationTo === 'categories' ? 'categories' : 'products';
  const hasMany = field.hasMany ?? false;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  const ids = useMemo<string[]>(() => {
    const raw = hasMany
      ? Array.isArray(value)
        ? value
        : []
      : value != null && value !== ''
        ? [value]
        : [];
    return raw
      .map((item) =>
        item && typeof item === 'object' && 'id' in item
          ? String((item as { id: string | number }).id)
          : String(item),
      )
      .filter((s) => s && s !== 'null' && s !== 'undefined');
  }, [value, hasMany]);

  // Seed labels from populated docs that arrive in the initial value (depth:2 load).
  useEffect(() => {
    const raw = hasMany ? (Array.isArray(value) ? value : []) : value != null ? [value] : [];
    const seed: Record<string, string> = {};
    for (const item of raw) {
      if (item && typeof item === 'object' && 'id' in item) {
        const o = item as { id: string | number; title?: string };
        if (typeof o.title === 'string') seed[String(o.id)] = o.title;
      }
    }
    if (Object.keys(seed).length) setLabels((prev) => ({ ...seed, ...prev }));
  }, [value, hasMany]);

  // Fetch labels for ids we don't yet have a title for (e.g. bare-id values).
  useEffect(() => {
    const missing = ids.filter((id) => !labels[id]);
    if (missing.length === 0) return;
    const params = new URLSearchParams({ depth: '0', limit: String(missing.length) });
    missing.forEach((id) => params.append('where[id][in][]', id));
    // Payload REST is mounted at '/admin/api' (see payload.config.ts routes.api).
    fetch(`/admin/api/${relationTo}?${params.toString()}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        const docs = Array.isArray(data?.docs) ? data.docs : [];
        const next: Record<string, string> = {};
        for (const d of docs) {
          if (d && d.id != null) next[String(d.id)] = typeof d.title === 'string' ? d.title : `#${d.id}`;
        }
        if (Object.keys(next).length) setLabels((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {
        /* ignore */
      });
  }, [ids, labels, relationTo]);

  // The internal id machinery is string-keyed for display/dedupe, but the repo's
  // Payload defaultIDType is `number` and relationship validation rejects stringified
  // ids on write. Coerce numeric-string ids back to numbers at the persistence boundary
  // so autosave PATCHes ids Payload accepts (matches the upload field, which stores the
  // native numeric id).
  const toNativeId = (id: string): string | number => (/^\d+$/.test(id) ? Number(id) : id);
  const commit = (nextIds: string[]) =>
    onChange(hasMany ? nextIds.map(toNativeId) : nextIds.length ? toNativeId(nextIds[0]!) : null);

  const add = (item: RelationItem) => {
    setLabels((prev) => ({ ...prev, [String(item.id)]: item.title }));
    if (hasMany) {
      if (!ids.includes(String(item.id))) commit([...ids, String(item.id)]);
    } else {
      commit([String(item.id)]);
    }
    setPickerOpen(false);
  };

  const remove = (id: string) => commit(ids.filter((x) => x !== id));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [m] = next.splice(from, 1);
    if (m === undefined) return;
    next.splice(to, 0, m);
    commit(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {ids.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-1 rounded border border-warm-200 px-2 py-1 text-sm"
          >
            <span className="truncate">{labels[id] ?? `#${id}`}</span>
            {hasMany && (
              <span className="ml-auto flex gap-1">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label="Move up"
                  className="text-xs"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || index === ids.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label="Move down"
                  className="text-xs"
                >
                  ↓
                </button>
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(id)}
              aria-label="Remove"
              className={(hasMany ? '' : 'ml-auto ') + 'text-xs text-red-500'}
            >
              ✕
            </button>
          </li>
        ))}
        {ids.length === 0 && <li className="px-1 text-xs text-warm-400">None selected.</li>}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setPickerOpen(true)}
        className="rounded border border-warm-300 px-2 py-1 text-xs"
      >
        {relationTo === 'products' ? '+ Add product' : 'Choose collection'}
      </button>
      {pickerOpen && (
        <RelationshipPicker
          relationTo={relationTo}
          onSelect={add}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// Names of `text` fields that hold a CSS color and should render a swatch picker
// instead of a raw hex input. backgroundCustom is the appearance custom-color field.
// Invariant: every THEMED_COLOR_BASES entry (lib/page-builder/themed-color.ts) must
// also appear here, or its themed picker would fall through to a plain text input.
const COLOR_FIELDS = new Set(['backgroundCustom']);
const HEX6 = /^#[0-9a-fA-F]{6}$/;

function ColorField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}): ReactElement {
  const hex = typeof value === 'string' ? value : '';
  // Native <input type="color"> needs a valid #rrggbb; fall back to a neutral
  // swatch for display when empty/invalid without committing it.
  const swatch = HEX6.test(hex) ? hex : '#f5f0eb';
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={swatch}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pick color"
        className="h-8 w-10 shrink-0 cursor-pointer rounded border border-warm-300 bg-transparent p-0 disabled:cursor-not-allowed"
      />
      <input
        type="text"
        value={hex}
        disabled={disabled}
        placeholder="#f5f0eb"
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
      />
      {hex && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear color"
          className="text-xs text-red-500"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
  themeMode = 'light',
  values,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange?: (name: string, value: unknown) => void;
  themeMode?: ThemeMode;
  values?: Record<string, unknown>;
}): ReactElement | null {
  const disabled = !onChange;
  const label = field.label ?? field.name;
  const id = `fld-${field.name}`;
  const isThemedColor = THEMED_COLOR_BASES.has(field.name);
  const activeName = isThemedColor ? activeColorSlot(field.name, themeMode) : field.name;
  const activeValue = isThemedColor ? values?.[activeName] : value;
  const set = (v: unknown) => onChange?.(activeName, v);

  const control = (() => {
    switch (field.type) {
      case 'text':
        if (COLOR_FIELDS.has(field.name)) {
          const showInheritHint = isThemedColor && themeMode === 'dark' && !activeValue;
          return (
            <div className="flex flex-col gap-1">
              <ColorField id={id} value={activeValue} disabled={disabled} onChange={set} />
              {showInheritHint && (
                <span className="text-xs text-warm-400">Empty — inherits the light color.</span>
              )}
            </div>
          );
        }
        return (
          <input
            id={id}
            type="text"
            className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
            rows={3}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'select':
        return (
          <select
            id={id}
            className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'upload': {
        const [pickerOpen, setPickerOpen] = useState(false);
        const mediaUrl = value && typeof value === 'object' && 'url' in (value as Record<string, unknown>)
          ? (value as Record<string, unknown>).url as string | undefined
          : undefined;
        const mediaId = value && typeof value === 'object' && 'id' in (value as Record<string, unknown>)
          ? (value as Record<string, unknown>).id
          : typeof value === 'string' || typeof value === 'number'
            ? value
            : undefined;

        return (
          <div className="flex flex-col gap-1">
            {mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="" className="h-24 w-full rounded border object-cover" />
            ) : mediaId ? (
              <span className="text-xs text-warm-500">Media #{String(mediaId)}</span>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPickerOpen(true)}
              className="rounded border border-warm-300 px-2 py-1 text-xs"
            >
              {mediaUrl || mediaId ? 'Change image' : 'Choose image'}
            </button>
            {pickerOpen && (
              <MediaPicker
                onSelect={(media) => {
                  set(media.id);
                  setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        );
      }
      case 'array':
        return (
          <ArrayField
            field={field}
            rows={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
            onChange={(rows) => set(rows)}
          />
        );
      case 'number':
        return (
          <input
            id={id}
            type="number"
            className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
            value={typeof value === 'number' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
          />
        );
      case 'checkbox':
        return (
          <input
            id={id}
            type="checkbox"
            className="h-4 w-4 self-start rounded border-warm-300 accent-blue-500 disabled:cursor-not-allowed"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => set(e.target.checked)}
          />
        );
      case 'date':
        return (
          <input
            id={id}
            type="datetime-local"
            className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
            value={toDateInputValue(value)}
            disabled={disabled}
            onChange={(e) =>
              set(e.target.value === '' ? null : new Date(e.target.value).toISOString())
            }
          />
        );
      case 'group':
        return (
          <GroupField
            field={field}
            value={value && typeof value === 'object' ? (value as Record<string, unknown>) : {}}
            onChange={(next) => set(next)}
          />
        );
      case 'relationship':
        return <RelationshipField field={field} value={value} disabled={disabled} onChange={set} />;
      case 'richText':
        return (
          <RichTextField value={value} disabled={disabled} onChange={set} />
        );
      default:
        // Unsupported field type; show a placeholder badge.
        return (
          <span className="text-xs italic text-warm-400">
            {field.type} field — editable in a later phase
          </span>
        );
    }
  })();

  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-xs font-medium text-warm-600">{label}</span>
      {control}
    </label>
  );
}