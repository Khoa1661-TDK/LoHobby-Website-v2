// components/console/media/MediaGrid.tsx
//
// Media library (board 11): the 6-column grid of 1:1 thumbnails, some of them
// video (play glyph). The artboard drew flat placeholder squares as a stand-in
// for the thumbnails; those squares are now the backdrop behind the real image.

export interface MediaItem {
  id: string;
  kind: 'image' | 'video';
  url: string | null;
  alt: string;
}

function PlayGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="var(--adm-action-ink)"
      aria-hidden="true"
    >
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

export function MediaGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid flex-1 grid-cols-6 gap-2.5 overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative flex aspect-square items-center justify-center overflow-hidden bg-[var(--adm-placeholder)]"
        >
          {item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt} className="h-full w-full object-cover" />
          ) : null}
          {item.kind === 'video' ? (
            <span className="absolute inset-0 flex items-center justify-center">
              <PlayGlyph />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
