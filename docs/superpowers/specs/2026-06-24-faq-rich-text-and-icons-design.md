# FAQ Rich Text Rendering + Block Icons

**Date:** 2026-06-24
**Status:** Approved

## Goal

Two improvements:
1. Render Lexical rich text answers in the FAQ component with full formatting (bold, links, lists, paragraphs) instead of stripping to plain text
2. Add admin block-picker icons for the 11 blocks that currently lack them

## Part A — Lexical Rich Text Renderer

### Problem
Both `FAQ.tsx` and `RichText.tsx` use a local `extractTextFromLexical()` helper that walks the Lexical JSON tree and concatenates only text nodes — discarding all formatting, links, lists, and structure.

### Solution
Create a shared `renderLexical()` function in `components/blocks/_primitives.tsx` that uses Payload's built-in `@payloadcms/richtext-lexical/react` serializer to produce proper React nodes.

### Implementation
- `renderLexical(json)` accepts the Lexical JSON root object and returns `ReactNode`
- Uses `@payloadcms/richtext-lexical/react` (already a project dependency)
- FAQ answers and RichText content both call this helper
- Fall back to plain text extraction if the serializer throws

### Files
- `components/blocks/_primitives.tsx` — add `renderLexical()` export
- `components/blocks/FAQ.tsx` — replace `answerText()` + `extractTextFromLexical()` with `renderLexical()`
- `components/blocks/RichText.tsx` — replace local `extractTextFromLexical()` + `dangerouslySetInnerHTML` with `renderLexical()`

## Part B — Block Icons

### Problem
11 newer blocks lack `imageURL`/`imageAltText` in their Payload Block definitions, so they show a generic placeholder in the admin block picker.

### Blocks Missing Icons
Button, Text, SocialBar, Spacer, Columns, CallToAction, Stats, Quote, CardGrid, Banner, Steps

### Solution
Create 11 SVG files in `public/admin/block-previews/` matching the existing style:
- 64×40 viewBox
- `fill="none"` `stroke="currentColor"` `stroke-width="1.5"`
- `stroke-linecap="round"` `stroke-linejoin="round"`
- Simple, minimal line-art

Then add `imageURL` and `imageAltText` to each block's Payload definition.

### Files
- `public/admin/block-previews/{button,text,social-bar,spacer,columns,call-to-action,stats,quote,card-grid,banner,steps}.svg` — 11 new icons
- `src/payload/blocks/{Button,Text,SocialBar,Spacer,Columns,CallToAction,Stats,Quote,CardGrid,Banner,Steps}.ts` — add `imageURL` + `imageAltText`