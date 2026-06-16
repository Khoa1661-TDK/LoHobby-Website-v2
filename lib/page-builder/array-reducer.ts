// Immutable ops for a block's array-field rows.
export type Row = Record<string, unknown>;

export function addRow(rows: Row[], template: Row): Row[] {
  return [...rows, structuredClone(template)];
}
export function removeRow(rows: Row[], index: number): Row[] {
  return rows.filter((_, i) => i !== index);
}
export function moveRow(rows: Row[], from: number, to: number): Row[] {
  if (from < 0 || from >= rows.length) return rows;
  const target = Math.max(0, Math.min(to, rows.length - 1));
  const next = [...rows];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved!);
  return next;
}
export function updateRowField(rows: Row[], index: number, name: string, value: unknown): Row[] {
  return rows.map((row, i) => (i === index ? { ...row, [name]: value } : row));
}