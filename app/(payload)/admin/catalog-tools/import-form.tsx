// app/(payload)/admin/catalog-tools/import-form.tsx
'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';

export default function CatalogImportForm(): ReactElement {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File)) {
      toast.error('Chọn file CSV.');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch('/api/admin/catalog/import', { method: 'POST', body });
      const json = (await res.json().catch(() => null)) as
        | { created?: number; updated?: number; skipped?: number; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error ?? 'Import thất bại');
      }
      toast.success(
        `Xong: ${json?.created ?? 0} tạo, ${json?.updated ?? 0} cập nhật, ${json?.skipped ?? 0} bỏ qua.`,
      );
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <input
        name="file"
        type="file"
        accept=".csv,text/csv"
        required
        className="block w-full text-sm text-neutral-700"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-filament-600 px-4 py-2 text-sm font-medium text-white hover:bg-filament-700 disabled:opacity-60"
      >
        {submitting ? 'Đang import…' : 'Import CSV'}
      </button>
    </form>
  );
}
