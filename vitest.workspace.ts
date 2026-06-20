import path from 'node:path';
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    name: 'node',
    test: {
      environment: 'node',
      include: [
        'lib/__tests__/**/*.test.ts',
        'app/**/__tests__/**/*.test.ts',
        'scripts/__tests__/**/*.test.ts',
      ],
      setupFiles: ['lib/__tests__/vitest-setup.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@payload-config': path.resolve(__dirname, './payload.config.ts'),
      },
    },
  },
  {
    name: 'jsdom',
    test: {
      environment: 'jsdom',
      include: ['components/**/__tests__/**/*.test.tsx'],
      setupFiles: [
        'lib/__tests__/vitest-setup.ts',
        'lib/__tests__/vitest-setup-react.ts',
      ],
      globals: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@payload-config': path.resolve(__dirname, './payload.config.ts'),
      },
    },
  },
]);
