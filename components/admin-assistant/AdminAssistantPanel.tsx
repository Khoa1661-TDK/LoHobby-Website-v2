'use client';

// components/admin-assistant/AdminAssistantPanel.tsx — the CMS chat surface.
// Streams NDJSON from /api/admin-assistant and renders two kinds of card: a link (from
// open_admin_page) and a staged proposal, which only becomes a real write once the
// operator presses Confirm.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { parseNdjsonStream } from '@/lib/ai/parse-ndjson';

/** Mirrors LoopEvent in lib/ai/agent-loop. Declared locally so no server module is
 *  reachable from the client bundle. */
type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'summary'; text: string }
  | { type: 'error'; error: string }
  | { type: 'tool'; name: string }
  | { type: 'data'; payload: unknown }
  | { type: 'done' };

type LinkCard = { kind: 'link'; url: string; label: string };

type ProposalCard = {
  kind: 'orderAction' | 'productUpdate' | 'productImages' | 'settingsUpdate';
  summary?: string;
  [key: string]: unknown;
};

type Card =
  | { id: string; card: 'link'; data: LinkCard }
  | {
      id: string;
      card: 'proposal';
      data: ProposalCard;
      state: 'pending' | 'applying' | 'done' | 'failed';
      message?: string;
    };

type Entry =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; cards: Card[] };

const HISTORY_KEY = 'admin-assistant:v1';
const MAX_HISTORY = 30;

const TOOL_LABELS: Record<string, string> = {
  find_orders: 'đang tìm đơn hàng…',
  get_order: 'đang đọc đơn hàng…',
  find_products: 'đang tìm sản phẩm…',
  get_product: 'đang đọc sản phẩm…',
  search_media: 'đang tìm ảnh…',
  read_settings: 'đang đọc cài đặt…',
  describe_target: 'đang xem cấu trúc…',
  open_admin_page: 'đang tìm màn hình…',
  propose_order_action: 'đang chuẩn bị thao tác đơn…',
  propose_product_update: 'đang chuẩn bị cập nhật sản phẩm…',
  propose_product_images: 'đang chuẩn bị đổi ảnh…',
  propose_settings_update: 'đang chuẩn bị đổi cài đặt…',
};

function uid(): string {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isLinkCard(value: unknown): value is LinkCard {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.kind === 'link' && typeof v.url === 'string';
}

function isProposalCard(value: unknown): value is ProposalCard {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as Record<string, unknown>).kind;
  return (
    kind === 'orderAction' ||
    kind === 'productUpdate' ||
    kind === 'productImages' ||
    kind === 'settingsUpdate'
  );
}

function loadHistory(): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

/** Proposals are not persisted: a stale Confirm button after a reload would act on state
 *  the operator can no longer see. */
function persistable(entries: Entry[]): Entry[] {
  return entries
    .slice(-MAX_HISTORY)
    .map((entry) => (entry.role === 'assistant' ? { ...entry, cards: [] } : entry));
}

export default function AdminAssistantPanel({ onClose }: { onClose: () => void }): ReactElement {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [activity, setActivity] = useState('');
  const [entries, setEntries] = useState<Entry[]>(() => loadHistory());
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(persistable(entries)));
    } catch {
      // A full or disabled localStorage must never break the chat.
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function patchLast(fn: (entry: Extract<Entry, { role: 'assistant' }>) => void): void {
    setEntries((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last || last.role !== 'assistant') return prev;
      const copy = { ...last, cards: [...last.cards] };
      fn(copy);
      next[next.length - 1] = copy;
      return next;
    });
  }

  async function send(): Promise<void> {
    const text = prompt.trim();
    if (!text || busy) return;

    setPrompt('');
    setBusy(true);
    setActivity('');
    setEntries((prev) => [
      ...prev,
      { id: uid(), role: 'user', text },
      { id: uid(), role: 'assistant', text: '', cards: [] },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/admin-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => ({ error: 'Không gọi được trợ lý.' }));
        patchLast((entry) => {
          entry.text = (detail as { error?: string }).error ?? 'Không gọi được trợ lý.';
        });
        return;
      }

      for await (const event of parseNdjsonStream<StreamEvent>(res.body)) {
        if (event.type === 'token') {
          patchLast((entry) => {
            entry.text += event.text;
          });
        } else if (event.type === 'summary') {
          patchLast((entry) => {
            entry.text = event.text;
          });
        } else if (event.type === 'tool') {
          setActivity(TOOL_LABELS[event.name] ?? 'đang xử lý…');
        } else if (event.type === 'error') {
          patchLast((entry) => {
            entry.text = entry.text ? `${entry.text}\n\n${event.error}` : event.error;
          });
        } else if (event.type === 'data') {
          const payload = event.payload;
          patchLast((entry) => {
            if (isLinkCard(payload)) {
              entry.cards.push({ id: uid(), card: 'link', data: payload });
            } else if (isProposalCard(payload)) {
              entry.cards.push({ id: uid(), card: 'proposal', data: payload, state: 'pending' });
            }
          });
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        patchLast((entry) => {
          entry.text = err instanceof Error ? err.message : 'Trợ lý gặp lỗi.';
        });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setActivity('');
    }
  }

  async function confirmCard(entryId: string, cardId: string): Promise<void> {
    let proposal: ProposalCard | null = null;
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId || entry.role !== 'assistant') return entry;
        return {
          ...entry,
          cards: entry.cards.map((card) => {
            if (card.id !== cardId || card.card !== 'proposal') return card;
            proposal = card.data;
            return { ...card, state: 'applying' as const };
          }),
        };
      }),
    );
    if (!proposal) return;

    let ok = false;
    let message = 'Không thực hiện được thao tác.';
    try {
      const res = await fetch('/api/admin-assistant/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal }),
      });
      const result = (await res.json()) as { ok?: boolean; message?: string };
      ok = result.ok === true;
      if (result.message) message = result.message;
    } catch (err) {
      message = err instanceof Error ? err.message : message;
    }

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId || entry.role !== 'assistant') return entry;
        return {
          ...entry,
          cards: entry.cards.map((card) =>
            card.id === cardId && card.card === 'proposal'
              ? { ...card, state: ok ? ('done' as const) : ('failed' as const), message }
              : card,
          ),
        };
      }),
    );
  }

  function discardCard(entryId: string, cardId: string): void {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId && entry.role === 'assistant'
          ? { ...entry, cards: entry.cards.filter((card) => card.id !== cardId) }
          : entry,
      ),
    );
  }

  function clearHistory(): void {
    setEntries([]);
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-md flex-col border-l border-neutral-300 bg-white text-neutral-900 shadow-2xl">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">Trợ lý quản trị</p>
          <p className="text-xs text-neutral-500">Mọi thay đổi cần bạn xác nhận</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearHistory}
            className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
          >
            Xóa
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {entries.length === 0 && (
          <div className="space-y-2 text-sm text-neutral-500">
            <p>Ví dụ:</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>tôi đổi phí ship ở đâu?</li>
              <li>xác nhận đơn hàng mới nhất</li>
              <li>sản phẩm nào sắp hết hàng?</li>
            </ul>
          </div>
        )}

        {entries.map((entry) =>
          entry.role === 'user' ? (
            <div key={entry.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white">
                {entry.text}
              </p>
            </div>
          ) : (
            <div key={entry.id} className="space-y-2">
              {entry.text && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{entry.text}</p>
              )}

              {entry.cards.map((card) =>
                card.card === 'link' ? (
                  <a
                    key={card.id}
                    href={card.data.url}
                    className="block rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <span className="font-medium">{card.data.label || card.data.url}</span>
                    <span className="block text-xs text-neutral-500">{card.data.url}</span>
                  </a>
                ) : (
                  <div
                    key={card.id}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{card.data.summary ?? 'Thay đổi đang chờ'}</p>

                    {card.state === 'pending' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void confirmCard(entry.id, card.id)}
                          className="rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => discardCard(entry.id, card.id)}
                          className="rounded border border-neutral-300 px-3 py-1 text-xs hover:bg-white"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    )}

                    {card.state === 'applying' && (
                      <p className="mt-2 text-xs text-neutral-500">Đang thực hiện…</p>
                    )}
                    {card.state === 'done' && (
                      <p className="mt-2 text-xs text-emerald-700">✓ {card.message}</p>
                    )}
                    {card.state === 'failed' && (
                      <p className="mt-2 text-xs text-rose-700">✕ {card.message}</p>
                    )}
                  </div>
                ),
              )}
            </div>
          ),
        )}

        {activity && <p className="text-xs italic text-neutral-500">{activity}</p>}
      </div>

      <div className="border-t border-neutral-200 p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          disabled={busy}
          placeholder="Hỏi hoặc yêu cầu thay đổi…"
          className="w-full resize-none rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-100"
        />
        <div className="mt-2 flex justify-end gap-2">
          {busy && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="rounded border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-50"
            >
              Dừng
            </button>
          )}
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || prompt.trim().length === 0}
            className="rounded bg-neutral-900 px-4 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Đang xử lý…' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  );
}
