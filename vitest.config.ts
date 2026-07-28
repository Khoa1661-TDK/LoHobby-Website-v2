import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, '.'),
  '@payload-config': path.resolve(__dirname, './payload.config.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: [
            'lib/__tests__/**/*.test.ts',
            'app/**/__tests__/**/*.test.ts',
            'components/**/__tests__/**/*.test.ts',
            'scripts/__tests__/**/*.test.ts',
            'src/**/__tests__/**/*.test.ts',
          ],
          setupFiles: ['lib/__tests__/vitest-setup.ts'],
          // `src/payload/__tests__/jobs-task-registration.test.ts` imports
          // `shopnexPlugins`, which transitively imports `@shopnex/analytics-plugin`.
          // That package's compiled `import pkg from "../package.json"` has no
          // `with { type: 'json' }` attribute, so Node's native ESM loader
          // (which Vitest otherwise defers to for node_modules) rejects it.
          // Forcing these packages through Vite's transform pipeline instead
          // resolves the JSON import correctly, same as webpack/tsx already do.
          server: { deps: { inline: [/@shopnex\//] } },
        },
      },
      {
        resolve: { alias },
        // App components rely on the automatic JSX runtime (Next compiles them that
        // way and most don't import React). Match that here so they render under SSR.
        esbuild: { jsx: 'automatic' },
        test: {
          name: 'jsdom',
          globals: true,
          environment: 'jsdom',
          include: ['components/**/__tests__/**/*.test.tsx'],
          setupFiles: [
            'lib/__tests__/vitest-setup.ts',
            'lib/__tests__/vitest-setup-react.ts',
          ],
        },
      },
    ],
  },
});
