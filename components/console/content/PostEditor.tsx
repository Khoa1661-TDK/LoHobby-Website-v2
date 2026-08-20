// components/console/content/PostEditor.tsx
//
// Blog post editor (board 13b). A wireframe: the left column is the rich-text
// editing region (a bordered placeholder — no editor library, per the brief),
// the right column is the fixed 300px settings rail. Server component: pure
// presentation over the PostEditorProps handed in.
//
// The title is real; the remaining bars are still placeholders and use the
// grey-ramp token --adm-fill.

export interface PostEditorProps {
  id: string;
  /** Post title, rendered in place of the title placeholder bar. */
  title: string;
}

function Bar({ height, width, tone }: { height: number; width: string; tone: string }) {
  return <div className={tone} style={{ height, width }} />;
}

export function PostEditor({ title }: PostEditorProps) {
  return (
    <div className="flex gap-6">
      {/* Left column — the rich-text editing region (bordered placeholder). */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="text-[22px] font-bold leading-none text-[var(--adm-ink)]">{title}</div>
        <div className="h-px bg-[var(--adm-line)]" />
        <Bar height={14} width="90%" tone="bg-[var(--adm-fill)]" />
        <Bar height={14} width="85%" tone="bg-[var(--adm-fill)]" />
        <div className="h-[200px] bg-[var(--adm-fill)]" />
        <Bar height={14} width="70%" tone="bg-[var(--adm-fill)]" />
        <Bar height={14} width="80%" tone="bg-[var(--adm-fill)]" />
      </div>

      {/* Right column — fixed 300px settings rail. */}
      <div className="flex w-[300px] flex-none flex-col gap-3">
        <div className="h-[150px] bg-[var(--adm-placeholder)]" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
          Danh mục blog
        </div>
        <div className="h-9 border border-[var(--adm-line)]" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
          SEO
        </div>
        <div className="h-[70px] bg-[var(--adm-raised)]" />
      </div>
    </div>
  );
}
