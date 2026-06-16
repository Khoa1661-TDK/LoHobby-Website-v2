// components/page-builder/FieldRenderer.tsx — schema-driven field panel.
'use client';
import type { ReactElement } from 'react';
import type { BlockSchema, FieldDescriptor } from '@/lib/page-builder/block-schemas';
import { isFieldVisible } from '@/lib/page-builder/conditions';

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
      default:
        // upload / array / richText handled in later phases; show a placeholder badge.
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