// src/payload/blocks/_identity.ts — stable per-block identity for cross-locale mirroring.
//
// Payload's own block `id` is stripped on every save (lib/page-builder/strip-block-ids.ts)
// to avoid cross-locale primary-key collisions, so it is not stable across saves and cannot
// be used to diff a layout. `blockKey` is a normal text field that survives stripping, so it
// persists in both locale copies and lets the mirror hook track the same section across vi/en.
import type { Field } from 'payload';

export const blockKeyField: Field = {
  name: 'blockKey',
  type: 'text',
  admin: { hidden: true },
};