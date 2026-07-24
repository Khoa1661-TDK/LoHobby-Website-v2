import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression guard for the circular import that made every Payload-touching
// route 500 with "Cannot access 'j' before initialization":
//
//   payload.config.ts → src/payload/collections/Redirects.ts
//     → lib/redirects.ts → import '@payload-config' → (back to payload.config.ts)
//
// The Redirects collection is registered in the Payload config, so any module it
// imports MUST NOT statically import '@payload-config' at the top level — doing so
// closes the cycle and, under webpack's async-module ordering, throws a temporal
// dead zone error while the collection export is still initializing.
//
// lib/redirects.ts still needs the config at RUNTIME (inside fetchValidRedirects);
// it must load it lazily via `await import('@payload-config')`, not a top import.
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readSource(relPath: string): string {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

/** Strip `import type … from '@payload-config'` — type-only imports are erased. */
function topLevelValueImportsPayloadConfig(source: string): boolean {
  return /^\s*import\s+(?!type\s)[^;]*from\s+['"]@payload-config['"]/m.test(source);
}

describe('redirects module does not close the payload-config import cycle', () => {
  it('should not statically import @payload-config in lib/redirects.ts', () => {
    const source = readSource('lib/redirects.ts');
    expect(topLevelValueImportsPayloadConfig(source)).toBe(false);
  });

  it('should still load @payload-config lazily at runtime', () => {
    const source = readSource('lib/redirects.ts');
    expect(source).toMatch(/import\(\s*['"]@payload-config['"]\s*\)/);
  });
});
