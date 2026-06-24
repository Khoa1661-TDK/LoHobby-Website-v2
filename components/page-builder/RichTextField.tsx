// components/page-builder/RichTextField.tsx — Markdown textarea that round-trips
// through native Lexical JSON, so the stored value matches Payload's richText shape.
'use client';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  markdownToLexical,
  lexicalToMarkdown,
  type LexicalDoc,
} from '@/lib/page-builder/lexical-markdown';

type Props = {
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
};

export default function RichTextField({ value, disabled, onChange }: Props): ReactElement {
  // Seed the textarea once from the stored Lexical JSON. Ref so we don't re-seed
  // on every external value change (the textarea is the source of truth while
  // editing, exactly like the plain text/textarea fields above).
  const seeded = useRef(false);
  const [md, setMd] = useState<string>(() => lexicalToMarkdown(value as LexicalDoc | null));

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    setMd(lexicalToMarkdown(value as LexicalDoc | null));
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <textarea
        rows={5}
        className="rounded border border-warm-300 bg-warm-50 px-2 py-1 text-sm text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-100"
        value={md}
        disabled={disabled}
        placeholder="Write the answer in Markdown…"
        onChange={(e) => {
          const next = e.target.value;
          setMd(next);
          onChange(markdownToLexical(next));
        }}
      />
      <span className="text-xs text-warm-400">
        Markdown — <strong>**bold**</strong>, <em>*italic*</em>, [link](url), - lists
      </span>
    </div>
  );
}