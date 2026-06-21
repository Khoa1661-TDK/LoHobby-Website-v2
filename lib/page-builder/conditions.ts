// lib/page-builder/conditions.ts — evaluate serializable field conditions against block values.
import type { FieldDescriptor } from '@/lib/page-builder/block-schemas';

export function isFieldVisible(
  field: FieldDescriptor,
  values: Record<string, unknown>,
): boolean {
  if (!field.condition) return true;
  return values[field.condition.field] === field.condition.equals;
}