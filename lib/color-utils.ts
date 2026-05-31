// lib/color-utils.ts — hex helpers for theme CSS variables

const HEX_RE = /^#?([0-9a-f]{6})$/i;

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_RE.test(withHash) ? withHash.toLowerCase() : fallback;
}

/** Darken a 6-digit hex color by mixing toward black (0–100). */
export function darkenHex(hex: string, amountPercent: number): string {
  const match = HEX_RE.exec(hex.startsWith('#') ? hex : `#${hex}`);
  if (!match?.[1]) return hex;
  const amount = Math.min(100, Math.max(0, amountPercent)) / 100;
  const r = Number.parseInt(match[1].slice(0, 2), 16);
  const g = Number.parseInt(match[1].slice(2, 4), 16);
  const b = Number.parseInt(match[1].slice(4, 6), 16);
  const mix = (channel: number): number => Math.round(channel * (1 - amount));
  const toHex = (channel: number): string => channel.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function hexToRgbTriplet(hex: string): string {
  const normalized = normalizeHexColor(hex, '#000000');
  const match = HEX_RE.exec(normalized);
  if (!match?.[1]) return '0 0 0';
  const r = Number.parseInt(match[1].slice(0, 2), 16);
  const g = Number.parseInt(match[1].slice(2, 4), 16);
  const b = Number.parseInt(match[1].slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}
