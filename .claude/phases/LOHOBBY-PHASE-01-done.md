# Phase 01 — Theme Foundation
Status: DONE

## Goal
Reset the global design tokens, fonts, and Tailwind config so the storefront baseline matches the "Lô Hobby" mockup (white surface, #111 ink, #f5f5f5 surface, Archivo display, Inter body, Playfair serif logo), make it the new default, and rewrite DESIGN.md to match.

## Tasks
- [x] Rewrite `app/[locale]/globals.css` light tokens to mockup palette; derive a dark ("carbon") palette so dark mode keeps working
- [x] Add Archivo + Playfair Display via `next/font/google` in storefront layout; wire `--font-archivo` / `--font-playfair` CSS vars
- [x] Update `tailwind.config.ts`: display→Archivo, sans→Inter, add `logo` family (Playfair), align radii/shadows to mockup
- [x] Update `lib/store-fonts.ts` so the active sans/display/logo vars default to the mockup fonts
- [x] Add mockup shadow scale + radius tokens (`--r`, `--sh-1/2/3`) usable by chrome + blocks
- [x] Rewrite `DESIGN.md` to document the new monochrome/serif-logo system
- [x] Log the retheme decision in `DECISIONS.md`

## Acceptance Criteria
- `pnpm build` / typecheck passes
- Light theme renders white bg, near-black ink, #f5f5f5 raised surfaces
- Dark mode still toggles without broken contrast
- DESIGN.md no longer contradicts the implemented theme

## Decisions Made This Phase
- The actual storefront backbone is the `warm-*`/`cream-*`/`terracotta-*` Tailwind
  scales (body uses `bg-warm-50 text-warm-900`, borders `warm-200`, focus rings
  `terracotta-400`) — NOT the semantic `--surface/--ink/--line` tokens. Flipped the
  baseline to monochrome by retuning those three scales to a neutral white→ink ramp
  at the token level, deferring per-component rework to Phase 2.
- Default font preset changed `jakarta` → `inter`; Archivo (display) + Playfair
  (logo/serif) are fixed brand identity, not preset-switchable. Legacy fonts
  (Fraunces, Jakarta, Roboto, Space Grotesk) retained for alternate presets.
- `globals.css` lives at `app/globals.css` (imported by the locale storefront
  layout), not `app/[locale]/globals.css` as the phase spec stated.
- Full details logged in DECISIONS.md (2026-06-30 entry).
