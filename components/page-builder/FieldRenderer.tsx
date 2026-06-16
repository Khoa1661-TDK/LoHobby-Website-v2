// components/page-builder/FieldRenderer.tsx — schema-driven field panel.
'use client';
import { useState, type ReactElement } from 'react';
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import { isFieldVisible } from '@/lib/page-builder/conditions';
import { defaultRowFor } from '@/lib/page-builder/default-block';
import { addRow, removeRow, moveRow, updateRowField } from '@/lib/page-builder/array-reducer';
import MediaPicker from './MediaPicker';

type Props = {
  schema: BlockSchema;
  values: Record<string, unknown>;
  /** Phase 1: omit to render read-only. Phase 2 wires this. */
  onChange?: (name: string, value: unknown) => void;
};

const APPEARANCE_FIELDS = new Set([
  'background',
  'backgroundCustom',
  'containerWidth',
  'paddingY',
]);

export default function FieldRenderer({ schema, values, onChange }: Props): ReactElement {
  const visible = (f: FieldDescriptor) => isFieldVisible(f, values);
  const sectionFields = schema.fields.filter((f) => !APPEARANCE_FIELDS.has(f.name) && visible(f));
  const appearanceFields = schema.fields.filter((f) => APPEARANCE_FIELDS.has(f.name) && visible(f));

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-500">
        {schema.label}
      </h2>
      {sectionFields.map((field) => (
        <Field key={field.name} field={field} value={values[field.name]} onChange={onChange} />
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

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDescriptor;
  value: unknown;
  onChange?: (name: string, value: unknown) => void;
}): ReactElement | null {
  const disabled = !onChange;
  const label = field.label ?? field.name;
  const id = `fld-${field.name}`;
  const set = (v: unknown) => onChange?.(field.name, v);

  const control = (() => {
    switch (field.type) {
      case 'text':
        return (
          <input
            id={id}
            type="text"
            className="rounded border border-warm-300 px-2 py-1 text-sm"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value)}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={id}
            className="rounded border border-warm-300 px-2 py-1 text-sm"
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
            className="rounded border border-warm-300 px-2 py-1 text-sm"
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
      default:
        // richText handled in a later phase; show a placeholder badge.
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