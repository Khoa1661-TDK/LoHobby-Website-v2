// lib/page-builder/themed-color.ts — maps a base color field to its per-theme slot.
// A "themed color" stores two hex values: <base> for light, <base>Dark for dark.
// The editor's theme-mode toggle decides which slot the single picker writes to.

export type ThemeMode = 'light' | 'dark';

/** Base appearance color fields that have a paired `<base>Dark` slot. */
export const THEMED_COLOR_BASES: ReadonlySet<string> = new Set(['backgroundCustom']);

/** The dark-slot field names, hidden as standalone fields in the panel. */
export const THEMED_DARK_SLOTS: ReadonlySet<string> = new Set(['backgroundCustomDark']);

/** The field name the picker binds to for the given theme mode. */
export function activeColorSlot(baseName: string, mode: ThemeMode): string {
  return mode === 'dark' ? `${baseName}Dark` : baseName;
}
