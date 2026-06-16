// components/page-builder/MediaPicker.tsx — browse + upload over Payload's /api/media.
'use client';
import { useEffect, useState, type ReactElement } from 'react';

type MediaDoc = { id: string | number; url?: string; filename?: string };

type Props = {
  onSelect: (media: MediaDoc) => void;
  onClose: () => void;
};

export default function MediaPicker({ onSelect, onClose }: Props): ReactElement {
  const [items, setItems] = useState<MediaDoc[]>([]);

  useEffect(() => {
    fetch('/api/media?limit=60&depth=0', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data?.docs) ? data.docs : []))
      .catch(() => setItems([]));
  }, []);

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.doc) onSelect(data.doc as MediaDoc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[80vh] w-[680px] overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Select media</h2>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {items.map((m) => (
            <button key={m.id} type="button" onClick={() => onSelect(m)} className="rounded border border-warm-200 p-1 hover:border-blue-400">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.url && <img src={m.url} alt={m.filename ?? ''} className="h-20 w-full object-cover" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}